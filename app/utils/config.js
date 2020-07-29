// 设备控制指令
const Instructions = {
    powerOn: 0,//开
    powerOff: 1,//关
    "i2": 2,//全加
    "i3": 3,//全减
    "i4": 4,//定时
    "i5": 5,//保暖
    "i6": 6,//左后
    "i7": 7,//右前
    "i8": 8,//左前
    "i9": 9,//右后
    "i10": 10,//上升
    "i11": 11,//下降
    "i12": 12,//停止
    "i13": 13,//
    "i14": 14,//添加设备
    "i15": 15,//清除设备
    "i16": 16,//烹饪+
    "i17": 17,//烹饪-
};

const StorageKey = {
    language: "LANGUAGE", //用户设定默认语言
    addDeviceTips: "ADDDEVICETIPS", //添加设备提示
    reminder: "REMINDER",//温馨提示
}

module.exports = {
    Instructions,
    StorageKey,
};