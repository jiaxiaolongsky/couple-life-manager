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

const DEFAULT_LAT = 39.9042;
const DEFAULT_LON = 116.4074;

export const weatherService = {
  async getCurrentWeather(): Promise<WeatherData | null> {
    console.log('[Weather] ===== 开始获取天气 =====');

    let latitude = DEFAULT_LAT;
    let longitude = DEFAULT_LON;
    let locationSource: string = 'default';

    const { status } = await Location.requestForegroundPermissionsAsync();
    console.log(`[Weather] 位置权限状态: ${status}`);

    if (status === 'granted') {
      console.log('[Weather] 尝试获取当前位置...');
      try {
        const location = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('位置获取超时(5s)')), 5000)
          )
        ]);

        if (location && 'coords' in location) {
          latitude = location.coords.latitude;
          longitude = location.coords.longitude;
          locationSource = 'gps';
          console.log(`[Weather] GPS 位置获取成功: ${latitude}, ${longitude}`);
        } else {
          console.warn('[Weather] 位置数据无效，使用默认位置');
        }
      } catch (locError: any) {
        console.warn(`[Weather] GPS 获取失败: ${locError.message}，使用默认位置`);
      }
    } else {
      console.warn('[Weather] 位置权限被拒绝，使用默认位置(北京)');
    }

    console.log(`[Weather] 最终坐标: ${latitude}, ${longitude} (来源: ${locationSource})`);

    const weather = await this.fetchWeatherWithFallback(latitude, longitude);
    if (!weather) {
      console.error('[Weather] 所有天气 API 都失败了，返回 null');
      return null;
    }

    const city = await this.getCityName(latitude, longitude, weather.city);
    console.log('[Weather] ===== 天气获取成功 =====', { ...weather, city });

    return { ...weather, city };
  },

  async fetchWeatherWithFallback(lat: number, lon: number): Promise<Partial<WeatherData> | null> {
    console.log('[Weather] 开始调用天气 API...');

    // 方案1: wttr.in JSON
    try {
      console.log('[Weather] 尝试 wttr.in JSON...');
      const response = await fetch(
        `https://wttr.in/${lat},${lon}?format=j1&lang=zh`,
        { signal: AbortSignal.timeout(10000) }
      );

      const contentType = response.headers.get('content-type');
      if (response.ok && contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('[Weather] wttr.in JSON 成功');

        if (data.current_condition && data.current_condition[0]) {
          const current = data.current_condition[0];
          const condition = current.lang_zh ? current.lang_zh[0].value :
            (current.weatherDesc ? current.weatherDesc[0].value : '未知');
          const temp = current.temp_C;

          let cityPinyin = '';
          if (data.nearest_area && data.nearest_area[0]) {
            const area = data.nearest_area[0];
            const areaName = area.areaName ? area.areaName[0].value : '';
            const region = area.region ? area.region[0].value : '';
            cityPinyin = region && region !== areaName ? `${region} · ${areaName}` : areaName;
          }

          const tip = this.generateTip(current.weatherDesc ? current.weatherDesc[0].value : '', temp);

          return { temp: `${temp}°C`, condition, city: cityPinyin || '未知地点', tip };
        }
      } else {
        console.warn('[Weather] wttr.in JSON 无效响应');
      }
    } catch (e: any) {
      console.warn(`[Weather] wttr.in JSON 失败: ${e.message}`);
    }

    // 方案2: wttr.in 文本格式
    try {
      console.log('[Weather] 尝试 wttr.in 文本格式...');
      const backupResp = await fetch(
        `https://wttr.in/${lat},${lon}?format=3&lang=zh`,
        { signal: AbortSignal.timeout(5000) }
      );

      const contentType = backupResp.headers.get('content-type');
      if (backupResp.ok && contentType && !contentType.includes('text/html')) {
        const text = await backupResp.text();
        if (text && text.includes(':')) {
          const parts = text.split(':');
          const city = parts[0].trim();
          const weatherPart = parts[1].trim();
          const weatherParts = weatherPart.split(' ');
          console.log('[Weather] wttr.in 文本格式成功');
          return {
            temp: weatherParts[weatherParts.length - 1] || '未知',
            condition: weatherParts[0] || '未知',
            city: city || '未知地点',
            tip: "愿你今天心情晴朗 ☀️"
          };
        }
      }
    } catch (e: any) {
      console.warn(`[Weather] wttr.in 文本格式失败: ${e.message}`);
    }

    // 方案3: Open-Meteo
    try {
      console.log('[Weather] 尝试 Open-Meteo...');
      const omResp = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (omResp.ok) {
        const omData = await omResp.json();
        if (omData.current_weather) {
          const code = omData.current_weather.weathercode;
          const weatherMap: Record<number, string> = {
            0: '晴朗', 1: '晴间多云', 2: '多云', 3: '阴天',
            45: '雾', 48: '雾',
            51: '毛毛雨', 53: '毛毛雨', 55: '毛毛雨',
            61: '小雨', 63: '中雨', 65: '大雨',
            71: '小雪', 73: '中雪', 75: '大雪',
            80: '阵雨', 81: '阵雨', 82: '阵雨',
            95: '雷阵雨', 96: '雷阵雨', 99: '雷阵雨'
          };
          console.log('[Weather] Open-Meteo 成功');
          return {
            temp: `${omData.current_weather.temperature}°C`,
            condition: weatherMap[code] || '未知',
            city: '当前位置',
            tip: "愿你今天心情晴朗 ☀️"
          };
        }
      }
    } catch (e: any) {
      console.warn(`[Weather] Open-Meteo 失败: ${e.message}`);
    }

    console.error('[Weather] 所有备用方案都失败了');
    return null;
  },

  async getCityName(lat: number, lon: number, fallbackCity: string): Promise<string> {
    let city = fallbackCity;

    try {
      console.log('[Weather] 尝试获取中文地址 (Expo Location)...');
      const reverseLoc = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });

      if (reverseLoc && reverseLoc.length > 0) {
        const address = reverseLoc[0];
        const cityName = address.city || address.region || '';
        const district = address.district || address.subregion || '';
        if (cityName || district) {
          const foundCity = (cityName && district) ? `${cityName} · ${district}` : (cityName || district);
          if (hasChinese(foundCity)) {
            city = foundCity;
            console.log(`[Weather] Expo 地址解析成功: ${city}`);
            return city;
          }
        }
      }
    } catch (e: any) {
      console.warn(`[Weather] Expo 地址解析失败: ${e.message}`);
    }

    if (!hasChinese(city)) {
      try {
        console.log('[Weather] 尝试 OSM 获取中文地址...');
        const osmResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=zh-CN`,
          { headers: { 'User-Agent': 'CoupleLifeManager/1.0' }, signal: AbortSignal.timeout(3000) }
        );

        if (osmResponse && osmResponse.ok) {
          const osmData = await osmResponse.json();
          const addr = osmData.address;
          const cityName = addr.city || addr.town || addr.municipality || addr.province || '';
          const districtName = addr.suburb || addr.district || addr.county || '';
          if (cityName || districtName) {
            city = (cityName && districtName && cityName !== districtName)
              ? `${cityName} · ${districtName}`
              : (cityName || districtName);
            console.log(`[Weather] OSM 地址解析成功: ${city}`);
          }
        }
      } catch (e: any) {
        console.warn(`[Weather] OSM 地址解析失败: ${e.message}`);
      }
    }

    city = forceChinese(city);
    return city;
  },

  generateTip(desc: string, temp: string): string {
    const descLower = desc.toLowerCase();
    if (descLower.includes('rain')) return "外面在下雨，记得带伞保护好自己哦 ☔";
    if (descLower.includes('cloud')) return "今天是阴天，出门也要保持好心情呀 ☁️";
    if (descLower.includes('snow')) return "下雪啦！和喜欢的人一起欣赏雪景吧 ❄️";
    const tempNum = Number(temp);
    if (tempNum > 30) return "天气炎热，注意防晒和多喝水哦 🥤";
    if (tempNum < 10) return "气温较低，多穿件衣服别着凉了 🧣";
    return "愿你今天心情晴朗 ☀️";
  }
};