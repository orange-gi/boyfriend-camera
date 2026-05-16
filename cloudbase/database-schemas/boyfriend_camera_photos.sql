-- 男友相机 - 数据库建表 SQL
-- 运行前请确保已在 CloudBase 控制台开通关系数据库服务
-- 数据库名: boyfriend-camera (如果 CloudBase 环境已自动创建)

-- 创建 photo_analysis 表
CREATE TABLE IF NOT EXISTS `boyfriend_camera_photos` (
  `id` varchar(36) PRIMARY KEY NOT NULL COMMENT '分析记录ID',
  `user_id` varchar(36) NOT NULL COMMENT '用户ID',
  `score` decimal(3,1) DEFAULT NULL COMMENT '总体评分 0-10',
  `highlights` text DEFAULT NULL COMMENT '亮点夸夸 JSON数组',
  `suggestions` text DEFAULT NULL COMMENT '改进建议 JSON数组',
  `tip` text DEFAULT NULL COMMENT '今日技巧',
  `analysis_text` text DEFAULT NULL COMMENT '完整分析文案',
  `image_url` varchar(500) DEFAULT NULL COMMENT '照片CloudBase存储路径',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='男友相机-照片分析记录';
