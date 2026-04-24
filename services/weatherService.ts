import * as Location from 'expo-location';

export interface WeatherData {
  temp: string;
  condition: string;
  city: string;
  tip: string;
}

const hasChinese = (str: string) => /[\u4e00-\u9fa5]/.test(str);

const forceChinese = (city: string) => {
  if (hasChinese(city)) return city;
  
  const pinyinMap: Record<string, string> = {
    'Beijing': '北京', 'Shanghai': '上海', 'Guangzhou': '广州', 'Shenzhen': '深圳',
    'Chengdu': '成都', 'Hangzhou': '杭州', 'Wuhan': '武汉', 'Xian': '西安',
    'Nanjing': '南京', 'Chongqing': '重庆', 'Tianjin': '天津', 'Suzhou': '苏州',
    'Xinghuo': '星火', 'Chaoyang': '朝阳', 'Haidian': '海淀', 'Dongcheng': '东城',
    'Xicheng': '西城', 'Fengtai': '丰台', 'Shijingshan': '石景山', 'Daxing': '大兴',
    'Tongzhou': '通州', 'Shunyi': '顺义', 'Changping': '昌平', 'Mentougou': '门头沟',
    'Fangshan': '房山', 'Huairou': '怀柔', 'Pinggu': '平谷', 'Miyun': '密云', 'Yanqing': '延庆'
  };
  
  let result = city;
  Object.keys(pinyinMap).forEach(key => {
    result = result.replace(new RegExp(key, 'gi'), pinyinMap[key]);
  });
  return result;
};

export const weatherService = {
  async getCurrentWeather(): Promise<WeatherData | null> {
    try {
      console.log('开始获取天气...');
      // 1. 获取权限
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('位置权限状态:', status);
      
      let latitude, longitude;

      if (status !== 'granted') {
        console.warn('未获得位置权限，使用默认位置(北京)');
        latitude = 39.9042;
        longitude = 116.4074;
      } else {
        // 2. 获取位置
        console.log('正在获取当前位置...');
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          latitude = location.coords.latitude;
          longitude = location.coords.longitude;
          console.log('当前经纬度:', latitude, longitude);
        } catch (locError) {
          console.error('获取位置失败，使用默认位置:', locError);
          latitude = 39.9042;
          longitude = 116.4074;
        }
      }

      // 3. 调用天气 API
      console.log(`正在请求天气数据: https://wttr.in/${latitude},${longitude}?format=j1&lang=zh`);
      const response = await fetch(`https://wttr.in/${latitude},${longitude}?format=j1&lang=zh`, {
        signal: AbortSignal.timeout(8000) // 增加到8秒超时
      });
      
      if (!response.ok) {
        throw new Error(`天气接口响应失败: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('天气数据获取成功');

      if (!data.current_condition || !data.current_condition[0]) {
        throw new Error('返回的天气数据格式不正确');
      }

      const current = data.current_condition[0];
      const condition = current.lang_zh ? current.lang_zh[0].value : (current.weatherDesc ? current.weatherDesc[0].value : '未知');
      const temp = current.temp_C;
      
      // 5. 获取地址信息
      // 初始值先尝试使用天气接口返回的地区名（通常是拼音）
      let cityPinyin = '';
      if (data.nearest_area && data.nearest_area[0]) {
        const area = data.nearest_area[0];
        const areaName = area.areaName ? area.areaName[0].value : '';
        const region = area.region ? area.region[0].value : '';
        cityPinyin = region && region !== areaName ? `${region} · ${areaName}` : areaName;
      }
      
      let city = cityPinyin || '未知地点';

      try {
        console.log('正在获取中文地址...');
        const reverseLoc = await Location.reverseGeocodeAsync({ latitude, longitude });
        
        if (reverseLoc && reverseLoc.length > 0) {
          const address = reverseLoc[0];
          const cityName = address.city || address.region || '';
          const district = address.district || address.subregion || '';
          if (cityName || district) {
            const foundCity = (cityName && district) ? `${cityName} · ${district}` : (cityName || district);
            if (hasChinese(foundCity)) {
              city = foundCity;
            }
          }
        }

        // 如果 Expo 没给汉字，尝试 OSM
        if (!hasChinese(city)) {
          console.log('尝试通过 OSM 获取中文地址...');
          const osmResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=zh-CN`,
            { headers: { 'User-Agent': 'CoupleLifeManager/1.0' }, signal: AbortSignal.timeout(3000) }
          ).catch(() => null);
          
          if (osmResponse && osmResponse.ok) {
            const osmData = await osmResponse.json();
            const addr = osmData.address;
            const cityName = addr.city || addr.town || addr.municipality || addr.province || '';
            const districtName = addr.suburb || addr.district || addr.county || '';
            if (cityName || districtName) {
              city = (cityName && districtName && cityName !== districtName) 
                ? `${cityName} · ${districtName}` 
                : (cityName || districtName);
            }
          }
        }
      } catch (geoError) {
        console.error('地址获取出错:', geoError);
      }

      // 强制汉字映射（最后保障，处理拼音或未识别的地址）
      city = forceChinese(city);

      // 6. 生成提示
      let tip = "愿你今天心情晴朗 ☀️";
      const desc = current.weatherDesc ? current.weatherDesc[0].value.toLowerCase() : '';
      
      if (desc.includes('rain')) {
        tip = "外面在下雨，记得带伞保护好自己哦 ☔";
      } else if (desc.includes('cloud')) {
        tip = "今天是阴天，出门也要保持好心情呀 ☁️";
      } else if (Number(temp) > 30) {
        tip = "天气炎热，注意防晒和多喝水哦 🥤";
      } else if (Number(temp) < 10) {
        tip = "气温较低，多穿件衣服别着凉了 🧣";
      }

      return {
        temp: `${temp}°C`,
        condition,
        city,
        tip
      };
    } catch (error) {
      console.error('获取天气详细失败:', error);
      return null;
    }
  }
};
