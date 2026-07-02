import { AgentData, AgentType, AgentRole, AbilityInfo, CircleAbility, SquareAbility, ImageAbility, CenterSquareAbility, RotatableImageAbility, ResizableSquareAbility } from '@/types';


const inGameMeters = 5.5;
const inGameMetersDiameter = inGameMeters * 2;

// Helper to create default abilities
// 技能索引规则: index 0=C, 1=Q, 2=E, 3=X
// 图标文件: grenade.png (C), ability1.png (Q), ability2.png (E), ultimate.png (X)
const createDefaultAbilities = (
  type: AgentType,
  name: string,
  abilityNames?: [string, string, string, string]
): AbilityInfo[] => {
  const slotFiles = ['grenade', 'ability1', 'ability2', 'ultimate'];
  const defaultNames: [string, string, string, string] = ['技能 1', '技能 2', '技能 3', '技能 4'];
  const names = abilityNames || defaultNames;
  return Array.from({ length: 4 }, (_, index) => {
    const abilityPath = `/abilities/${name.toLowerCase()}/${slotFiles[index]}.png`;
    return {
      name: names[index],
      iconPath: abilityPath,
      type,
      index,
      abilityData: { type: 'base', iconPath: abilityPath },
    };
  });
};

export const agentsData: Record<AgentType, AgentData> = {
  jett: {
    type: 'jett',
    role: 'duelist',
    name: '捷风',
    iconPath: '/agents/jett.png',
    abilities: createDefaultAbilities('jett', 'Jett', ['Cloudburst', 'Updraft', 'Tailwind', 'Blade Storm']),
  },

  raze: {
    type: 'raze',
    role: 'duelist',
    name: '雷兹',
    iconPath: '/agents/raze.png',
    abilities: createDefaultAbilities('raze', 'Raze', ['Boom Bot', 'Blast Pack', 'Paint Shells', 'Showstopper']),
  },

  phoenix: {
    type: 'phoenix',
    role: 'duelist',
    name: '不死鸟',
    iconPath: '/agents/phoenix.png',
    abilities: (() => {
      const abilities = createDefaultAbilities('phoenix', 'Phoenix', ['Blaze', 'Hot Hands', 'Curveball', 'Run it Back']);
      abilities[0].abilityData = {
        type: 'square',
        width: 5,
        height: 21 * inGameMeters,
        iconPath: abilities[0].iconPath,
        color: '#ff5252',
        isWall: true,
      } as SquareAbility;
      abilities[2].abilityData = {
        type: 'circle',
        iconPath: abilities[2].iconPath,
        size: 4.5 * inGameMetersDiameter,
        outlineColor: '#ff5252',
        hasCenterDot: true,
      } as CircleAbility;
      return abilities;
    })(),
  },

  astra: {
    type: 'astra',
    role: 'controller',
    name: '亚星卓',
    iconPath: '/agents/astra.png',
    abilities: (() => {
      const abilities = createDefaultAbilities('astra', 'Astra');
      // 亚星卓: C=重力之阱, Q=新星脉冲, E=星云(烟雾), X=宇宙分裂
      // index 0=C, 1=Q, 2=E, 3=X
      // 星云是E技能，在 index 2（对应 ability2.png）
      abilities[2] = {
        name: '星云',
        iconPath: '/abilities/astra/ability2.png',
        type: 'astra',
        index: 2,
        abilityData: { type: 'image', imagePath: '/agents/Astra/Smoke.webp', size: 4.75 * inGameMetersDiameter } as ImageAbility,
      };
      abilities[0].abilityData = {
        type: 'circle',
        iconPath: abilities[0].iconPath,
        size: 4.75 * inGameMetersDiameter,
        outlineColor: '#9c27b0',
      } as CircleAbility;
      abilities[1].abilityData = {
        type: 'circle',
        iconPath: abilities[1].iconPath,
        size: 4.75 * inGameMetersDiameter,
        outlineColor: '#9c27b0',
      } as CircleAbility;
      abilities[3].abilityData = {
        type: 'centerSquare',
        width: 5,
        height: 1000,
        iconPath: abilities[3].iconPath,
        color: '#9c27b0',
      } as CenterSquareAbility;
      abilities.push({
        name: '星体',
        iconPath: '/abilities/astra/ability2.png',
        type: 'astra',
        index: 4,
        abilityData: { type: 'base', iconPath: '/abilities/astra/ability2.png' },
      });
      return abilities;
    })(),
  },

  breach: {
    type: 'breach',
    role: 'initiator',
    name: '铁臂',
    iconPath: '/agents/breach.png',
    abilities: (() => {
      const abilities = createDefaultAbilities('breach', 'Breach', ['Aftershock', 'Flashpoint', 'Fault Line', 'Rolling Thunder']);
      abilities[0].abilityData = {
        type: 'square',
        width: 3 * inGameMetersDiameter,
        height: 10 * inGameMeters,
        iconPath: abilities[0].iconPath,
        color: '#ff9800',
      } as SquareAbility;
      abilities[2].abilityData = {
        type: 'resizableSquare',
        width: 7.5 * inGameMeters,
        height: 56 * inGameMeters,
        iconPath: abilities[2].iconPath,
        color: '#ff9800',
        minLength: 8 * inGameMeters,
        distanceBetweenAOE: 8 * inGameMeters,
      } as ResizableSquareAbility;
      abilities[3].abilityData = {
        type: 'square',
        width: 18 * inGameMeters,
        height: 32 * inGameMeters,
        iconPath: abilities[3].iconPath,
        color: '#ff9800',
        distanceBetweenAOE: 8 * inGameMeters,
      } as SquareAbility;
      return abilities;
    })(),
  },

  viper: {
    type: 'viper',
    role: 'controller',
    name: '蝰蛇',
    iconPath: '/agents/viper.png',
    abilities: (() => {
      const abilities = createDefaultAbilities('viper', 'Viper');
      // 蝰蛇: C=蛇吻, Q=瘴云, E=毒幕(烟雾), X=蝰腹
      // index 0=C, 1=Q, 2=E, 3=X
      // 毒幕是E技能，在 index 2（对应 ability2.png）
      abilities[2] = {
        name: '毒幕',
        iconPath: '/abilities/viper/ability2.png',
        type: 'viper',
        index: 2,
        abilityData: { type: 'image', imagePath: '/agents/Viper/Smoke.webp', size: 4.5 * inGameMetersDiameter } as ImageAbility,
      };
      abilities[0].abilityData = {
        type: 'circle',
        iconPath: abilities[0].iconPath,
        size: 4.5 * inGameMetersDiameter,
        outlineColor: '#76ff03',
        hasCenterDot: true,
      } as CircleAbility;
      abilities[1].abilityData = {
        type: 'circle',
        iconPath: abilities[1].iconPath,
        size: 4.5 * inGameMetersDiameter,
        outlineColor: '#76ff03',
        hasCenterDot: true,
      } as CircleAbility;
      return abilities;
    })(),
  },

  yoru: {
    type: 'yoru',
    role: 'duelist',
    name: '夜露',
    iconPath: '/agents/yoru.png',
    abilities: createDefaultAbilities('yoru', 'Yoru', ['FAKEOUT', 'BLINDSIDE', 'GATECRASH', 'DIMENSIONAL DRIFT']),
  },

  sova: {
    type: 'sova',
    role: 'initiator',
    name: '猎枭',
    iconPath: '/agents/sova.png',
    abilities: (() => {
      const abilities = createDefaultAbilities('sova', 'Sova', ['Owl Drone', 'Shock Bolt', 'Recon Bolt', "Hunter's Fury"]);
      abilities[1].abilityData = {
        type: 'circle',
        iconPath: abilities[1].iconPath,
        size: 4 * inGameMetersDiameter,
        outlineColor: '#0183ed',
        hasCenterDot: true,
      } as CircleAbility;
      abilities[2].abilityData = {
        type: 'circle',
        iconPath: abilities[2].iconPath,
        size: 30 * inGameMetersDiameter,
        outlineColor: '#0183ed',
        hasCenterDot: true,
      } as CircleAbility;
      abilities[3].abilityData = {
        type: 'square',
        width: 1.76 * inGameMetersDiameter,
        height: 66 * inGameMeters,
        iconPath: abilities[3].iconPath,
        color: '#0183ed',
      } as SquareAbility;
      return abilities;
    })(),
  },

  skye: {
    type: 'skye',
    role: 'initiator',
    name: '斯凯',
    iconPath: '/agents/skye.png',
    abilities: (() => {
      const abilities = createDefaultAbilities('skye', 'Skye', ['Regrowth', 'Trailblazer', 'Guiding Light', 'Seekers']);
      abilities[0].abilityData = {
        type: 'circle',
        iconPath: abilities[0].iconPath,
        size: 18 * inGameMetersDiameter,
        outlineColor: '#4caf50',
        hasCenterDot: true,
      } as CircleAbility;
      return abilities;
    })(),
  },

  kayo: {
    type: 'kayo',
    role: 'initiator',
    name: 'K/O',
    iconPath: '/agents/kay_o.png',
    abilities: (() => {
      const abilities = createDefaultAbilities('kayo', 'kay_o', ['FRAG/ment', 'FLASH/drive', 'ZERO/point', 'NULL/cmd']);
      abilities[0].abilityData = {
        type: 'circle',
        iconPath: abilities[0].iconPath,
        size: 4 * inGameMetersDiameter,
        outlineColor: '#8c06a3',
        hasCenterDot: true,
      } as CircleAbility;
      abilities[3].abilityData = {
        type: 'circle',
        iconPath: abilities[3].iconPath,
        size: 42.5 * inGameMetersDiameter,
        outlineColor: '#8c06a3',
        hasCenterDot: true,
      } as CircleAbility;
      abilities[2].abilityData = {
        type: 'circle',
        iconPath: abilities[2].iconPath,
        size: 15 * inGameMetersDiameter,
        outlineColor: '#6a0eb6',
        hasCenterDot: true,
      } as CircleAbility;
      return abilities;
    })(),
  },

  killjoy: {
    type: 'killjoy',
    role: 'sentinel',
    name: '奇乐',
    iconPath: '/agents/killjoy.png',
    abilities: (() => {
      const abilities = createDefaultAbilities('killjoy', 'Killjoy', ['Nanoswarm', 'ALARMBOT', 'TURRET', 'Lockdown']);
      abilities[0].abilityData = {
        type: 'circle',
        iconPath: abilities[0].iconPath,
        size: 5.5 * inGameMetersDiameter,
        outlineColor: '#6a0eb6',
        hasCenterDot: true,
      } as CircleAbility;
      abilities[3].abilityData = {
        type: 'circle',
        iconPath: abilities[3].iconPath,
        size: 32.5 * inGameMetersDiameter,
        outlineColor: '#6a0eb6',
        hasCenterDot: true,
      } as CircleAbility;
      abilities[1].abilityData = {
        type: 'circle',
        iconPath: abilities[1].iconPath,
        size: 40 * inGameMetersDiameter,
        outlineColor: '#ffffff',
        hasCenterDot: true,
        hasPerimeter: true,
        perimeterSize: 54.48 * inGameMetersDiameter,
        fillColor: '#6a0eb6',
      } as CircleAbility;
      abilities[2].abilityData = {
        type: 'circle',
        iconPath: abilities[2].iconPath,
        size: 40 * inGameMetersDiameter,
        outlineColor: 'rgba(255,255,255,0.1)',
        hasCenterDot: true,
        opacity: 0,
        fillColor: 'transparent',
      } as CircleAbility;
      return abilities;
    })(),
  },

  brimstone: {
    type: 'brimstone',
    role: 'controller',
    name: '炼狱',
    iconPath: '/agents/brimstone.png',
    abilities: (() => {
      const abilities = createDefaultAbilities('brimstone', 'Brimstone');
      // 炼狱: C=振奋信标, Q=燃烧榴弹, E=空投烟幕(烟雾), X=天基光束
      // index 0=C, 1=Q, 2=E, 3=X
      // 空投烟幕是E技能，在 index 2（对应 ability2.png）
      abilities[2] = {
        name: '空投烟幕',
        iconPath: '/abilities/brimstone/ability2.png',
        type: 'brimstone',
        index: 2,
        abilityData: { type: 'image', imagePath: '/agents/Brimstone/Smoke.webp', size: 4.15 * inGameMetersDiameter } as ImageAbility,
      };
      abilities[1].abilityData = {
        type: 'circle',
        iconPath: abilities[1].iconPath,
        size: 4.5 * inGameMetersDiameter,
        outlineColor: '#f44336',
        hasCenterDot: true,
      } as CircleAbility;
      abilities[3].abilityData = {
        type: 'circle',
        iconPath: abilities[3].iconPath,
        size: 9 * inGameMetersDiameter,
        outlineColor: '#f44336',
        hasCenterDot: true,
      } as CircleAbility;
      abilities[0].abilityData = {
        type: 'circle',
        iconPath: abilities[0].iconPath,
        size: 6 * inGameMetersDiameter,
        outlineColor: '#61fd83',
        hasCenterDot: true,
      } as CircleAbility;
      return abilities;
    })(),
  },

  cypher: {
    type: 'cypher',
    role: 'sentinel',
    name: '零',
    iconPath: '/agents/cypher.png',
    abilities: (() => {
      const abilities = createDefaultAbilities('cypher', 'Cypher', ['Trapwire', 'Cyber Cage', 'Spycam', 'Neural Theft']);
      abilities[0].abilityData = {
        type: 'resizableSquare',
        width: 3,
        height: 15 * inGameMeters,
        iconPath: abilities[0].iconPath,
        color: '#ffffff',
        minLength: inGameMeters,
        isWall: true,
      } as ResizableSquareAbility;
      abilities[1].abilityData = {
        type: 'circle',
        iconPath: abilities[1].iconPath,
        size: 3.72 * inGameMetersDiameter,
        outlineColor: '#ffffff',
        hasCenterDot: true,
      } as CircleAbility;
      return abilities;
    })(),
  },

  chamber: {
    type: 'chamber',
    role: 'sentinel',
    name: '尚勃勒',
    iconPath: '/agents/chamber.png',
    abilities: (() => {
      const abilities = createDefaultAbilities('chamber', 'Chamber', ['Trademark', 'Headhunter', 'Rendezvous', 'Tour De Force']);
      abilities[0].abilityData = {
        type: 'circle',
        iconPath: abilities[0].iconPath,
        size: 10 * inGameMetersDiameter,
        outlineColor: '#ffc107',
        hasCenterDot: true,
      } as CircleAbility;
      abilities[2].abilityData = {
        type: 'circle',
        iconPath: abilities[2].iconPath,
        size: 18 * inGameMetersDiameter,
        outlineColor: '#ffc107',
        hasCenterDot: true,
      } as CircleAbility;
      return abilities;
    })(),
  },

  fade: {
    type: 'fade',
    role: 'initiator',
    name: '黑梦',
    iconPath: '/agents/fade.png',
    abilities: (() => {
      const abilities = createDefaultAbilities('fade', 'Fade', ['Prowler', 'Seize', 'Haunt', 'Nightfall']);
      abilities[1].abilityData = {
        type: 'circle',
        iconPath: abilities[1].iconPath,
        size: 6.58 * inGameMetersDiameter,
        outlineColor: '#680a79',
        hasCenterDot: true,
      } as CircleAbility;
      abilities[2].abilityData = {
        type: 'circle',
        iconPath: abilities[2].iconPath,
        size: 30 * inGameMetersDiameter,
        outlineColor: '#680a79',
        hasCenterDot: true,
        opacity: 0,
      } as CircleAbility;
      abilities[3].abilityData = {
        type: 'square',
        width: 20 * inGameMeters,
        height: 40 * inGameMeters,
        iconPath: abilities[3].iconPath,
        color: '#680a79',
      } as SquareAbility;
      return abilities;
    })(),
  },

  neon: {
    type: 'neon',
    role: 'duelist',
    name: '霓虹',
    iconPath: '/agents/neon.png',
    abilities: (() => {
      const abilities = createDefaultAbilities('neon', 'Neon', ['Fast Lane', 'Relay Bolt', 'High Gear', 'Overdrive']);
      abilities[0].abilityData = {
        type: 'square',
        width: 3.5 * inGameMeters,
        height: 45 * inGameMeters,
        iconPath: abilities[0].iconPath,
        color: '#448aff',
        hasSideBorders: true,
        isTransparent: true,
      } as SquareAbility;
      abilities[1].abilityData = {
        type: 'circle',
        iconPath: abilities[1].iconPath,
        size: 5 * inGameMetersDiameter,
        outlineColor: '#2196f3',
        hasCenterDot: true,
      } as CircleAbility;
      return abilities;
    })(),
  },

  omen: {
    type: 'omen',
    role: 'controller',
    name: '幽影',
    iconPath: '/agents/omen.png',
    abilities: (() => {
      const abilities = createDefaultAbilities('omen', 'Omen');
      // 幽影: C=践影, Q=暗魇, E=黑瘴(烟雾), X=离魂
      // index 0=C, 1=Q, 2=E, 3=X
      // 黑瘴是E技能，在 index 2（对应 ability2.png）
      abilities[2] = {
        name: '黑瘴',
        iconPath: '/abilities/omen/ability2.png',
        type: 'omen',
        index: 2,
        abilityData: { type: 'image', imagePath: '/agents/Omen/Smoke.webp', size: 4.1 * inGameMetersDiameter } as ImageAbility,
      };
      abilities[1].abilityData = {
        type: 'square',
        width: 4.3 * inGameMetersDiameter,
        height: 25 * inGameMeters,
        iconPath: abilities[1].iconPath,
        color: '#673ab7',
      } as SquareAbility;
      return abilities;
    })(),
  },

  reyna: {
    type: 'reyna',
    role: 'duelist',
    name: '芮娜',
    iconPath: '/agents/reyna.png',
    abilities: createDefaultAbilities('reyna', 'Reyna', ['Leer', 'Devour', 'Dismiss', 'Empress']),
  },

  sage: {
    type: 'sage',
    role: 'sentinel',
    name: '贤者',
    iconPath: '/agents/sage.png',
    abilities: (() => {
      const abilities = createDefaultAbilities('sage', 'Sage');
      // 贤者: C=玉城(冰墙), Q=薄冰, E=逢春, X=再起
      // index 0=C, 1=Q, 2=E, 3=X
      // 玉城是C技能，在 index 0（对应 grenade.png）
      abilities[0].abilityData = {
        type: 'rotatableImage',
        imagePath: '/agents/Sage/wall.webp',
        width: 1.5 * inGameMeters,
        height: 10.4 * inGameMeters,
      } as RotatableImageAbility;
      abilities[1].abilityData = {
        type: 'circle',
        iconPath: abilities[1].iconPath,
        size: 6.5 * inGameMetersDiameter,
        outlineColor: '#448aff',
        hasCenterDot: true,
      } as CircleAbility;
      return abilities;
    })(),
  },

  clove: {
    type: 'clove',
    role: 'controller',
    name: '暮蝶',
    iconPath: '/agents/clove.png',
    abilities: (() => {
      const abilities = createDefaultAbilities('clove', 'Clove');
      // 暮蝶: C=残迹, Q=整妆(毒球), E=霞幕(封烟), X=追魂
      // 图标顺序: [grenade(C), ability1(Q), ability2(E), ultimate(X)]
      // 霞幕是E技能，在 index 2（对应 ability2.png）
      abilities[2] = {
        name: '霞幕',
        iconPath: '/abilities/clove/ability2.png',
        type: 'clove',
        index: 2,
        abilityData: { type: 'image', imagePath: '/agents/Clove/Smoke.webp', size: 4 * inGameMetersDiameter } as ImageAbility,
      };
      // 整妆是Q技能，在 index 1（对应 ability1.png）
      abilities[1].abilityData = {
        type: 'circle',
        iconPath: abilities[1].iconPath,
        size: 6 * inGameMetersDiameter,
        outlineColor: '#fb6a9a',
        hasCenterDot: true,
      } as CircleAbility;
      return abilities;
    })(),
  },

  iso: {
    type: 'iso',
    role: 'duelist',
    name: '壹决',
    iconPath: '/agents/iso.png',
    abilities: (() => {
      const abilities = createDefaultAbilities('iso', 'Iso', ['Contingency', 'Undercut', 'Double Tap', 'Kill Contract']);
      abilities[0].abilityData = {
        type: 'square',
        width: 4.5 * inGameMeters,
        height: 27.5 * inGameMeters,
        iconPath: abilities[0].iconPath,
        color: '#3f51b5',
        hasTopBorder: true,
        distanceBetweenAOE: 5 * inGameMeters,
      } as SquareAbility;
      abilities[1].abilityData = {
        type: 'square',
        width: 3 * inGameMetersDiameter,
        height: 34.875 * inGameMeters,
        iconPath: abilities[1].iconPath,
        color: '#3f51b5',
      } as SquareAbility;
      abilities[3].abilityData = {
        type: 'square',
        width: 15 * inGameMeters,
        height: 36 * inGameMeters,
        iconPath: abilities[3].iconPath,
        color: '#3f51b5',
      } as SquareAbility;
      return abilities;
    })(),
  },

  deadlock: {
    type: 'deadlock',
    role: 'sentinel',
    name: '钢锁',
    iconPath: '/agents/deadlock.png',
    abilities: (() => {
      const abilities = createDefaultAbilities('deadlock', 'Deadlock', ['Barrier Mesh', 'Sonic Sensor', 'GravNet', 'Annihilation']);
      abilities[0].abilityData = {
        type: 'circle',
        iconPath: abilities[0].iconPath,
        size: 6.5 * inGameMetersDiameter,
        outlineColor: '#2196f3',
        hasCenterDot: true,
      } as CircleAbility;
      abilities[1].abilityData = {
        type: 'square',
        width: 8 * inGameMeters,
        height: 9 * inGameMeters,
        iconPath: abilities[1].iconPath,
        color: '#2196f3',
      } as SquareAbility;
      return abilities;
    })(),
  },

  gekko: {
    type: 'gekko',
    role: 'initiator',
    name: '盖可',
    iconPath: '/agents/gekko.png',
    abilities: (() => {
      const abilities = createDefaultAbilities('gekko', 'Gekko', ['Mosh Pit', 'Wingman', 'Dizzy', 'Thrash']);
      abilities[0].abilityData = {
        type: 'circle',
        iconPath: abilities[0].iconPath,
        size: 6.2 * inGameMetersDiameter,
        outlineColor: '#76ff03',
        hasCenterDot: true,
      } as CircleAbility;
      return abilities;
    })(),
  },

  harbor: {
    type: 'harbor',
    role: 'controller',
    name: '海神',
    iconPath: '/agents/harbor.png',
    abilities: (() => {
      const abilities = createDefaultAbilities('harbor', 'Harbor');
      // 海神: C=瀑流, Q=海盾(烟雾), E=狂潮, X=爆泉
      // index 0=C, 1=Q, 2=E, 3=X
      // 海盾是Q技能，在 index 1（对应 ability1.png）
      abilities[1] = {
        name: '海盾',
        iconPath: '/abilities/harbor/ability1.png',
        type: 'harbor',
        index: 1,
        abilityData: { type: 'image', imagePath: '/agents/Harbor/Smoke.webp', size: 4.5 * inGameMetersDiameter } as ImageAbility,
      };
      abilities[0].abilityData = {
        type: 'circle',
        iconPath: abilities[0].iconPath,
        size: 6 * inGameMetersDiameter,
        outlineColor: '#03a9f4',
        hasCenterDot: true,
      } as CircleAbility;
      abilities[2].abilityData = {
        type: 'square',
        width: 20 * inGameMeters,
        height: 40 * inGameMeters,
        iconPath: abilities[2].iconPath,
        color: '#03a9f4',
      } as SquareAbility;
      abilities[3].abilityData = {
        type: 'circle',
        iconPath: abilities[3].iconPath,
        size: 9 * inGameMetersDiameter,
        outlineColor: '#03a9f4',
        hasCenterDot: true,
      } as CircleAbility;
      return abilities;
    })(),
  },

  vyse: {
    type: 'vyse',
    role: 'sentinel',
    name: '维斯',
    iconPath: '/agents/vyse.png',
    abilities: (() => {
      const abilities = createDefaultAbilities('vyse', 'Vyse', ['Razorvine', 'Shear', 'Arc Rose', 'Steel Garden']);
      abilities[0].abilityData = {
        type: 'square',
        width: 1 * inGameMeters,
        height: 12 * inGameMeters,
        iconPath: abilities[0].iconPath,
        color: '#673ab7',
      } as SquareAbility;
      abilities[1].abilityData = {
        type: 'circle',
        iconPath: abilities[1].iconPath,
        size: 6.25 * inGameMetersDiameter,
        outlineColor: '#673ab7',
        hasCenterDot: true,
      } as CircleAbility;
      abilities[3].abilityData = {
        type: 'circle',
        iconPath: abilities[3].iconPath,
        size: 32.5 * inGameMetersDiameter,
        outlineColor: '#673ab7',
        hasCenterDot: true,
      } as CircleAbility;
      return abilities;
    })(),
  },

  tejo: {
    type: 'tejo',
    role: 'initiator',
    name: '钛狐',
    iconPath: '/agents/tejo.png',
    abilities: (() => {
      const abilities = createDefaultAbilities('tejo', 'Tejo', ['Stealth Drone', 'Special Delivery', 'Guided Salvo', 'Armageddon']);
      abilities[0].abilityData = {
        type: 'circle',
        iconPath: abilities[0].iconPath,
        size: 16 * inGameMetersDiameter,
        outlineColor: '#ff9800',
        hasCenterDot: true,
      } as CircleAbility;
      abilities[1].abilityData = {
        type: 'circle',
        iconPath: abilities[1].iconPath,
        size: 5.25 * inGameMetersDiameter,
        outlineColor: '#ff9800',
        hasCenterDot: true,
      } as CircleAbility;
      abilities[2].abilityData = {
        type: 'circle',
        iconPath: abilities[2].iconPath,
        size: 4.5 * inGameMetersDiameter,
        outlineColor: '#ff9800',
        hasCenterDot: true,
      } as CircleAbility;
      abilities[3].abilityData = {
        type: 'square',
        width: 10 * inGameMeters,
        height: 32 * inGameMeters,
        iconPath: abilities[3].iconPath,
        color: '#ff9800',
      } as SquareAbility;
      return abilities;
    })(),
  },

  waylay: {
    type: 'waylay',
    role: 'duelist',
    name: '幻棱',
    iconPath: '/agents/waylay.png',
    abilities: (() => {
      const abilities = createDefaultAbilities('waylay', 'Waylay', ['Saturate', 'Lightspeed', 'Refract', 'Convergent Paths']);
      abilities[0].abilityData = {
        type: 'circle',
        iconPath: abilities[0].iconPath,
        size: 5 * inGameMetersDiameter,
        outlineColor: '#7c4dff',
        hasCenterDot: true,
      } as CircleAbility;
      abilities[3].abilityData = {
        type: 'square',
        width: 13.5 * inGameMeters,
        height: 36 * inGameMeters,
        iconPath: abilities[3].iconPath,
        color: '#7c4dff',
        distanceBetweenAOE: 3 * inGameMeters,
      } as SquareAbility;
      return abilities;
    })(),
  },

  veto: {
    type: 'veto',
    role: 'sentinel',
    name: '维夫',
    iconPath: '/agents/veto.png',
    abilities: (() => {
      const abilities = createDefaultAbilities('veto', 'Veto', ['Crosscut', 'Chokehold', 'Interceptor', 'Evolution']);
      abilities[0].abilityData = {
        type: 'circle',
        iconPath: abilities[0].iconPath,
        size: 24 * inGameMetersDiameter,
        outlineColor: '#40c4ff',
        hasCenterDot: true,
      } as CircleAbility;
      abilities[1].abilityData = {
        type: 'circle',
        iconPath: abilities[1].iconPath,
        size: 6.58 * inGameMetersDiameter,
        outlineColor: '#40c4ff',
        hasCenterDot: true,
      } as CircleAbility;
      abilities[2].abilityData = {
        type: 'circle',
        iconPath: abilities[2].iconPath,
        size: 18 * inGameMetersDiameter,
        outlineColor: '#40c4ff',
        hasCenterDot: true,
      } as CircleAbility;
      return abilities;
    })(),
  },

  miks: {
    type: 'miks',
    role: 'controller',
    name: '米克斯',
    iconPath: '/agents/miks.png',
    abilities: (() => {
      const abilities = createDefaultAbilities('miks', 'miks');
      // 米克斯E技能是烟雾，在 index 2（对应 ability2.png）
      abilities[2] = {
        name: '烟雾',
        iconPath: '/abilities/miks/ability2.png',
        type: 'miks',
        index: 2,
        abilityData: { type: 'image', imagePath: '/agents/Miks/Smoke.webp', size: 4.5 * inGameMetersDiameter } as ImageAbility,
      };
      return abilities;
    })(),
  },
};

export const roleColors: Record<AgentRole, string> = {
  controller: '#4caf50',
  duelist: '#f44336',
  initiator: '#ff9800',
  sentinel: '#2196f3',
};

export const roleNames: Record<AgentRole, string> = {
  controller: '控场',
  duelist: '决斗',
  initiator: '先锋',
  sentinel: '哨卫',
};
