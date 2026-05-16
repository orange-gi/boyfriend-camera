/**
 * 男友相机 - analyze-photo 云函数
 *
 * 接收照片 base64，调用 MiniMax VL 分析，组装分析文案返回
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
    // 调用 MiniMax VL（abab6.5s-chat）分析图片
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
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[analyze-photo] MiniMax API 失败:", response.status, errorText);
      return { error: "AI 分析失败，请重试", code: 500 };
    }

    const result = await response.json();
    const analysisText = result.choices?.[0]?.message?.content || "";

    // 简单解析文本，提取评分（如果有）
    // 后续可以扩展为结构化 JSON 输出
    return {
      code: 0,
      data: {
        analysis: analysisText,
        // TODO: 结构化解析 score/highlights/suggestions/tip
      },
    };
  } catch (error) {
    console.error("[analyze-photo] 异常:", error);
    return { error: "分析失败，请重试", code: 500 };
  }
};
