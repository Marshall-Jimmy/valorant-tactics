// Agent Types
export type AgentType = 
  // 决斗者 (Duelists)
  | 'jett' | 'phoenix' | 'raze' | 'reyna' | 'yoru' | 'neon' | 'iso' | 'waylay'
  // 控场者 (Controllers)
  | 'astra' | 'brimstone' | 'clove' | 'harbor' | 'miks' | 'omen' | 'viper'
  // 先锋 (Initiators)
  | 'breach' | 'fade' | 'gekko' | 'kayo' | 'skye' | 'sova' | 'tejo'
  // 哨卫 (Sentinels)
  | 'chamber' | 'cypher' | 'deadlock' | 'killjoy' | 'sage' | 'veto' | 'vyse';

export type AgentRole = 'controller' | 'duelist' | 'initiator' | 'sentinel';

export interface AgentData {
  type: AgentType;
  role: AgentRole;
  name: string;
  iconPath: string;
  abilities: AbilityInfo[];
}

// Ability Types
export interface AbilityInfo {
  name: string;
  name_cn?: string;
  iconPath: string;
  type: AgentType;
  index: number;
  abilityData?: Ability;
}

export type AbilityType = 'base' | 'image' | 'circle' | 'square' | 'centerSquare' | 'rotatableImage' | 'resizableSquare';

export interface BaseAbility {
  type: 'base';
  iconPath: string;
}

export interface ImageAbility {
  type: 'image';
  imagePath: string;
  size: number;
}

export interface CircleAbility {
  type: 'circle';
  iconPath: string;
  size: number;
  outlineColor: string;
  hasCenterDot?: boolean;
  hasPerimeter?: boolean;
  fillColor?: string;
  opacity?: number;
  perimeterSize?: number;
}

export interface SquareAbility {
  type: 'square';
  width: number;
  height: number;
  iconPath: string;
  color: string;
  distanceBetweenAOE?: number;
  isWall?: boolean;
  hasTopBorder?: boolean;
  hasSideBorders?: boolean;
  isTransparent?: boolean;
}

export interface CenterSquareAbility {
  type: 'centerSquare';
  width: number;
  height: number;
  iconPath: string;
  color: string;
}

export interface RotatableImageAbility {
  type: 'rotatableImage';
  imagePath: string;
  width: number;
  height: number;
}

export interface ResizableSquareAbility {
  type: 'resizableSquare';
  width: number;
  height: number;
  iconPath: string;
  color: string;
  distanceBetweenAOE?: number;
  isWall?: boolean;
  hasTopBorder?: boolean;
  hasSideBorders?: boolean;
  isTransparent?: boolean;
  minLength: number;
}

export type Ability = BaseAbility | ImageAbility | CircleAbility | SquareAbility | CenterSquareAbility | RotatableImageAbility | ResizableSquareAbility;

// Map Types
export type MapValue = 
  | 'ascent' | 'breeze' | 'lotus' | 'icebox' | 'sunset' 
  | 'split' | 'haven' | 'fracture' | 'abyss' | 'pearl' | 'bind' | 'corrode'
  | 'summit';

export interface MapData {
  id: MapValue;
  name: string;
  name_en: string;
  scale: number;
}

// Strategy/Placement Types
export interface PlacedAbility {
  id: string;
  ability: AbilityInfo;
  position: { x: number; y: number };
  rotation?: number;
  length?: number;
  isAlly: boolean;
}

export interface PlacedAgent {
  id: string;
  agentType: AgentType;
  position: { x: number; y: number };
  isAlly: boolean;
  state: 'alive' | 'dead';
}

export interface PlacedUltOrb {
  id: string;
  position: { x: number; y: number };
}

export interface DrawingElement {
  id: string;
  type: 'line' | 'arrow' | 'freehand' | 'text';
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
  text?: string;
}

export interface Strategy {
  id: string;
  name: string;
  map: MapValue;
  isAttack: boolean;
  placedAbilities: PlacedAbility[];
  placedAgents: PlacedAgent[];
  drawings: DrawingElement[];
  splashUrl?: string;
  createdAt: number;
  updatedAt: number;
}

// UI State
export type InteractionState = 
  | 'none' 
  | 'placingAbility' 
  | 'placingAgent' 
  | 'drawing' 
  | 'lineupPlacing'
  | 'dragging';

export type ToolType = 'select' | 'ability' | 'agent' | 'draw' | 'erase' | 'lineup' | 'text' | 'ultOrb';

export interface TextElement {
  id: string;
  text: string;
  position: { x: number; y: number };
  color: string;
  fontSize: number;
}
