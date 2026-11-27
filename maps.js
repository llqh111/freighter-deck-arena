import {buildWorld} from './world.js?v=25';
import {buildPyramidWorld} from './pyramid-world.js?v=1';

export const maps={
  ship:{
    id:'ship',
    name:'运输船',
    eng:'TRANSPORT SHIP',
    intro:'选择阵营与装备，从中央货柜区或舷侧管道登上对方甲板。',
    mapTitle:'甲板平面图',
    radarLabel:'甲板雷达',
    legend:['保卫者舱室','潜伏者舱室','管道出口方向'],
    readyText:'甲板就绪',
    build:buildWorld
  },
  pyramid:{
    id:'pyramid',
    name:'新金字塔',
    eng:'NEW PYRAMID',
    intro:'穿越封闭埃及石室三门洞，卡住中路对狙石缝、登顶双侧阶梯金字塔或沿回廊绕后突袭。',
    mapTitle:'神殿平面图',
    radarLabel:'战术雷达',
    legend:['保卫者石室','潜伏者石室','侧翼回廊方向'],
    readyText:'神殿就绪',
    build:buildPyramidWorld
  }
};

export const mapOrder=['ship','pyramid'];
