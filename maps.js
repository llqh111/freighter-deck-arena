import {buildWorld} from './world.js?v=25';
import {buildPyramidWorld} from './pyramid-world.js?v=3';

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
    intro:'经典 CF 风格纯石质神殿对称竞技场：封闭三门墓室、中路对狙石缝、双向地面侧道与跳箱身法高台。',
    mapTitle:'神殿平面图',
    radarLabel:'战术雷达',
    legend:['保卫者墓室','潜伏者墓室','侧翼通道方向'],
    readyText:'神殿就绪',
    build:buildPyramidWorld
  }
};

export const mapOrder=['ship','pyramid'];
