/**
 * 图层黑名单规则：满足任一条件时标记为黑名单，用于将图层名称渲染为红色。
 * 1) 不透明度不为 100%
 * 2) 填充不透明度不为 100%
 * 3) 存在用户蒙版或矢量蒙版
 * 4) 使用非线性混合模式
 */

export const NON_LINEAR_BLEND_MODES = new Set<string>([
  // 常见非线性混合模式
  'overlay',
  'softLight',
  'hardLight',
  'vividLight',
  'linearLight',
  'pinLight',
  'hardMix',
  'colorDodge',
  'colorBurn',
]);

export const isNonLinearBlendMode = (mode?: string): boolean => {
  if (!mode) return false;
  return NON_LINEAR_BLEND_MODES.has(mode);
};

export interface BlacklistCheckInput {
  opacity?: number;       // 0-100
  fillOpacity?: number;   // 0-100
  hasMask?: boolean;
  blendMode?: string;
}

export const isLayerBlacklisted = (info: BlacklistCheckInput): boolean => {
  const opacityBad = typeof info.opacity === 'number' ? info.opacity !== 100 : false;
  const fillOpacityBad = typeof info.fillOpacity === 'number' ? info.fillOpacity !== 100 : false;
  const hasMask = !!info.hasMask;
  const nonLinear = isNonLinearBlendMode(info.blendMode);
  return opacityBad || fillOpacityBad || hasMask || nonLinear;
};