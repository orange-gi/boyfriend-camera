#!/bin/bash
# 男友相机 - 闭环验证脚本
# 用法: bash tests/verify.sh

set -e

echo "========================================="
echo "男友相机闭环验证 $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="

APP_DIR="/root/.openclaw/agent-nanyou/boyfriend-camera-app"
CLOUD_DIR="/root/.openclaw/agent-nanyou/cloudbase"
ENV_ID="jiulou-4gu5ljkpa1082b3c"

FAILED=0

# 1. TypeScript 编译检查
echo "[1/4] TypeScript 编译..."
cd "$APP_DIR"
if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
  echo "❌ TypeScript 有错误:"
  npx tsc --noEmit 2>&1 | grep "error TS"
  FAILED=1
else
  echo "✅ TypeScript 通过"
fi

# 2. 云函数部署
echo "[2/4] 云函数 getTemplates..."
cd "$CLOUD_DIR"
if tcb fn deploy getTemplates --envId "$ENV_ID" --force 2>&1 | grep -q "deployed successfully"; then
  echo "✅ 云函数部署成功"
else
  echo "❌ 云函数部署失败"
  FAILED=1
fi

# 3. 云函数调用验证
echo "[3/4] 云函数调用..."
RESULT=$(tcb fn invoke getTemplates --envId "$ENV_ID" 2>&1)
if echo "$RESULT" | grep -q '"latestVersion"'; then
  COUNT=$(echo "$RESULT" | grep -o '"template_"' | wc -l)
  echo "✅ 云函数返回 $COUNT 个模板"
else
  echo "❌ 云函数调用失败"
  FAILED=1
fi

# 4. Git 提交状态
echo "[4/4] Git 状态..."
cd "$APP_DIR"
COMMITS=$(git log --oneline origin/main..HEAD 2>/dev/null | wc -l)
if [ "$COMMITS" -gt 0 ]; then
  echo "✅ 待推送 commit: $COMMITS 个"
  git log --oneline origin/main..HEAD | head -5
else
  echo "✅ 无待推送 commit（已同步或无新提交）"
fi

echo "========================================="
if [ $FAILED -eq 0 ]; then
  echo "✅ 全部检查通过"
else
  echo "❌ 有失败项"
fi
echo "========================================="
exit $FAILED
