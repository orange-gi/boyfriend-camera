/**
 * 男友相机 - analyze-photo 云函数 v2
 *
 * 接收照片 base64，调用 MiniMax VL 分析，组装分析文案返回
 * 改进：增强解析稳定性 + 重试逻辑 + 回退文案
 */
const express = require("express");
const router = express.Router();

const MINIMAX_API_URL = "https://api.minimaxi.chat/v1/image_generation";

function getMiniMaxApiKey() {
  return process.env.MINIMAX_API_KEY || "";
}

// 提示词模板
const SYSTEM_PROMPT = `你是一位温暖有趣的AI拍照教练，专门帮助女生教会男友拍出更好的照片。

你的回复结构永远是：
1. 亮点夸夸：找到照片至少一个优点，真诚夸奖
2. 改进建议：1-3条具体可操作的建议（从构图、用光、角度、背景、表情引导五个维度）
3. 今日技巧：一个小技巧，女生可以转发给男友

语气：像闺蜜聊天，温暖有趣，不说教不批评。
不要批评男友，只是给出建设性的建议。`;

const USER_PROMPT_TEMPLATE = (imageBase64) => ({
  role: "user",
  content: [
    {
      type: "image_url",
      image_url: {
        url: `data:image/jpeg;base64,${imageBase64}`,
      },
    },
    {
      type: "text",
      text: "这是男友拍的照片，请分析一下有哪些亮点可以夸夸，有哪些可以改进的地方？最后给一个今日小技巧。",
    },
  ],
});

// ========== Round 33 新增：回退文案池（API 失败或解析失败时使用） ==========
const FALLBACK_POOL = {
  highlights: [
    '男朋友有在认真拍！态度满分，继续保持～',
    '这张照片很有生活感，记录本身就是一件很酷的事！',
    '男朋友的审美在慢慢进步，这张比上次更好了！',
    '构图有感觉了！再稍微注意一下光线就更完美～',
  ],
  suggestions: [
    '可以让男朋友打开九宫格辅助线，构图会更好看～',
    '建议找个光源充足的地方，让脸正对光源会更亮～',
    '让男朋友稍微蹲低一点，镜头仰拍会更显瘦哦～',
    '双手握稳手机，深呼吸后再按快门会更清晰～',
  ],
  dailyTip: [
    '今日技巧：拍照前让男朋友问一句"这样可以吗"，十张里能挑出一两张特别好的！',
    '今日技巧：逆光时打开闪光灯补光，脸就不会黑黑的了～',
    '今日技巧：教男朋友打开九宫格网格线，构图立刻专业起来！',
    '今日技巧：让男朋友蹲低一点仰拍，大长腿效果绝了！',
  ],
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** 解析 AI 返回的文本，提取结构化字段 */
function parseAnalysis(analysisText) {
  if (!analysisText || analysisText.trim().length < 5) return null

  // 灵活匹配多种分隔符（中文冒号、全角冒号、空格、换行）
  const patterns = [
    // 标准格式
    { key: 'highlights', re: /(?:亮点夸夸|夸夸|亮点)[：:]?\s*([\s\S]*?)(?=(?:改进建议|建议|技巧|今日)|$)/i },
    { key: 'suggestions', re: /(?:改进建议|建议)[：:]?\s*([\s\S]*?)(?=(?:今日技巧|技巧)|$)/i },
    { key: 'dailyTip', re: /(?:今日技巧|小技巧|技巧)[：:]?\s*([\s\S]*?)$/i },
    // 替代格式
    { key: 'highlights', re: /(?:夸夸|优点)[：:]?\s*([\s\S]*?)(?=(?:建议|技巧)|$)/i },
    { key: 'suggestions', re: /建议[：:]?\s*([\s\S]*?)(?=(?:技巧|tip)|$)/i },
    { key: 'dailyTip', re: /(?:tip|技巧|tips)[：:]?\s*([\s\S]*?)$/i },
  ]

  const result = { analysis: analysisText, highlights: '', suggestions: '', dailyTip: '' }
  for (const { key, re } of patterns) {
    if (!result[key]) {
      const m = analysisText.match(re)
      if (m && m[1]) result[key] = m[1].trim()
    }
  }

  // 如果解析出任意一个字段就算成功
  if (result.highlights || result.suggestions || result.dailyTip) return result
  return null
}

/** 带重试的 API 调用 */
async function callMinimaxWithRetry(messages, apiKey, maxRetries = 2) {
  let lastError
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000) // 20秒超时

      const response = await fetch("https://api.minimaxi.chat/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "abab6.5s-chat",
          messages,
          max_tokens: 1024,
          temperature: 0.7,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (response.status === 429 || response.status === 503) {
        // 限流或服务不可用，等一下再试
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
          continue
        }
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[analyze-photo] MiniMax API 失败 (attempt ${attempt + 1}):`, response.status, errorText)
        lastError = `AI 分析失败 (${response.status})`
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 500))
          continue
        }
        continue
      }

      const result = await response.json()
      return result
    } catch (e) {
      console.error(`[analyze-photo] 请求异常 (attempt ${attempt + 1}):`, e.message)
      lastError = e.message
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, 500))
    }
  }
  throw new Error(lastError || 'API 调用失败')
}

/**
 * 主入口
 */
exports.main = async function (event, context) {
  const body = event.body || event;

  // 获取图片 base64
  let imageBase64 = body.image_base64 || body.image;
  if (!imageBase64) {
    return { error: "缺少图片数据", code: 400 };
  }

  // 去除可能的 data URL 前缀
  imageBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  const apiKey = getMiniMaxApiKey();
  if (!apiKey) {
    return { error: "Missing MINIMAX_API_KEY", code: 500 };
  }

  try {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
            },
          },
          {
            type: "text",
            text: "这是男友拍的照片，请分析一下有哪些亮点可以夸夸，有哪些可以改进的地方？最后给一个今日小技巧。",
          },
        ],
      },
    ];

    const result = await callMinimaxWithRetry(messages, apiKey)
    const analysisText = result.choices?.[0]?.message?.content || "";

    // 尝试解析结构化内容（多模式匹配）
    const parsed = parseAnalysis(analysisText)

    if (parsed) {
      return { code: 0, data: parsed }
    }

    // 解析失败但有原始文本
    if (analysisText && analysisText.trim().length > 0) {
      return {
        code: 0,
        data: {
          analysis: analysisText,
          highlights: pickRandom(FALLBACK_POOL.highlights),
          suggestions: pickRandom(FALLBACK_POOL.suggestions),
          dailyTip: pickRandom(FALLBACK_POOL.dailyTip),
        },
      }
    }

    // 完全无内容，返回回退文案
    return {
      code: 0,
      data: {
        analysis: '照片分析中，请稍后重试～',
        highlights: pickRandom(FALLBACK_POOL.highlights),
        suggestions: pickRandom(FALLBACK_POOL.suggestions),
        dailyTip: pickRandom(FALLBACK_POOL.dailyTip),
      },
    }
  } catch (error) {
    console.error("[analyze-photo] 异常:", error);
    return {
      error: "分析失败，请稍后重试～",
      code: 500,
      // 同时返回回退文案，提升用户体验
      fallback: {
        highlights: pickRandom(FALLBACK_POOL.highlights),
        suggestions: pickRandom(FALLBACK_POOL.suggestions),
        dailyTip: pickRandom(FALLBACK_POOL.dailyTip),
      },
    };
  }
};
          dailyTip: tipMatch ? tipMatch[1].trim() : '',
        };
      }
    } catch (_e) {
      // 解析失败，返回原始文本
    }

    return {
      code: 0,
      data: parsed,
    };
  } catch (error) {
    console.error("[analyze-photo] 异常:", error);
    return { error: "分析失败，请重试", code: 500 };
  }
};
