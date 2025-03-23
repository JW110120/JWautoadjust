export const adjustmentMenuItems = [
    { id: 'brightness', name: '亮度/对比度', command: 'brightnessEvent' },
    { id: 'levels', name: '色阶', command: 'levels' },
    { id: 'curves', name: '曲线', command: 'curves' },
    { id: 'exposure', name: '曝光度', command: 'exposure' },
    { id: 'vibrance', name: '自然饱和度', command: 'vibrance' },
    { id: 'hsl', name: '色相/饱和度', command: 'hueSaturation' },
    { id: 'colorBalance', name: '色彩平衡', command: 'colorBalance' },
    { id: 'blackAndWhite', name: '黑白', command: 'blackAndWhite' },
    { id: 'photoFilter', name: '照片滤镜', command: 'photoFilter' },
    { id: 'channelMixer', name: '通道混合器', command: 'channelMixer' },
    { id: 'colorLookup', name: '颜色查找', command: 'colorLookup' },
    { id: 'shadowHighlight', name: '阴影/高光', command: 'shadowHighlight' },
    { id: 'invert', name: '反相', command: 'invert' },
    { id: 'posterize', name: '色调分离', command: 'posterize' },
    { id: 'threshold', name: '阈值', command: 'threshold' },
    { id: 'gradientMap', name: '渐变映射', command: 'gradientMapEvent' },
    { id: 'selectiveColor', name: '可选颜色', command: 'selectiveColor' },
    { id: 'average', name: '平均', command: 'average' }
];

// 创建事件到名称的映射
export const eventToNameMap = {
    'curves': '曲线',  
    'levels': '色阶',
    'brightnessEvent': '亮度/对比度',
    'hueSaturation': '色相/饱和度',
    'colorBalance': '色彩平衡',
    'exposure': '曝光度',
    'vibrance': '自然饱和度',
    'blackAndWhite': '黑白',
    'photoFilter': '照片滤镜',
    'channelMixer': '通道混合器',
    'colorLookup': '颜色查找',
    'shadowHighlight': '阴影/高光',  // 移除(&W)
    'invert': '反相',
    'posterize': '色调分离',
    'threshold': '阈值',
    'gradientMapEvent': '渐变映射',
    'selectiveColor': '可选颜色',
    'average': '平均'
};