interface DrawOptions {
  darkColor?: string;
  lightColor?: string;
  margin?: number;
}

export function drawQRCode(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  options: DrawOptions = {}
): void {
  const qr = createQRCode(text);
  const modules = qr.modules;
  if (!modules) return;
  const count = modules.length;
  const cellSize = size / count;

  const darkColor = options.darkColor || '#000000';
  const lightColor = options.lightColor || '#FFFFFF';

  // Background
  ctx.save();
  ctx.fillStyle = lightColor;
  ctx.fillRect(x, y, size, size);

  // QR Modules
  ctx.fillStyle = darkColor;
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (modules[r][c]) {
        const mx = x + c * cellSize;
        const my = y + r * cellSize;
        ctx.fillRect(mx, my, cellSize + 0.5, cellSize + 0.5);
      }
    }
  }
  ctx.restore();
}

function createQRCode(text: string): QRCodeModel {
  const typeNumber = getBestTypeNumber(text);
  const errorCorrectionLevel = 'M';
  const qr = new QRCodeModel(typeNumber, errorCorrectionLevel);
  qr.addData(text);
  qr.make();
  return qr;
}

function getBestTypeNumber(text: string): number {
  const len = text.length;
  if (len < 18) return 2;
  if (len < 32) return 3;
  if (len < 46) return 4;
  if (len < 64) return 5;
  if (len < 84) return 6;
  if (len < 106) return 7;
  if (len < 134) return 8;
  if (len < 160) return 9;
  return 10;
}

/* ── QR Code Algorithm Core Implementation ── */

class QR8BitByte {
  mode: number;
  data: string;
  constructor(data: string) {
    this.mode = 4; // 8-bit byte
    this.data = data;
  }
  getLength(): number {
    return this.data.length;
  }
  write(buffer: QRBitBuffer): void {
    for (let i = 0; i < this.data.length; i++) {
      buffer.put(this.data.charCodeAt(i), 8);
    }
  }
}

const QRErrorCorrectionLevel = { L: 1, M: 0, Q: 3, H: 2 };

class QRRSBlock {
  totalCount: number;
  dataCount: number;
  constructor(totalCount: number, dataCount: number) {
    this.totalCount = totalCount;
    this.dataCount = dataCount;
  }

  static RS_BLOCK_TABLE = [
    // Version 1
    [1, 26, 16],
    // Version 2
    [1, 44, 28],
    // Version 3
    [1, 70, 44],
    // Version 4
    [2, 50, 32],
    // Version 5
    [2, 67, 43],
    // Version 6
    [2, 43, 27, 2, 44, 28],
    // Version 7
    [4, 49, 31],
    // Version 8
    [2, 60, 38, 2, 61, 39],
    // Version 9
    [3, 58, 36, 2, 59, 37],
    // Version 10
    [4, 69, 43, 1, 70, 44]
  ];

  static getRSBlocks(typeNumber: number, _errorCorrectionLevel: string): QRRSBlock[] {
    const rsBlock = QRRSBlock.RS_BLOCK_TABLE[typeNumber - 1];
    if (!rsBlock) {
      return [new QRRSBlock(44, 28)]; // Fallback
    }
    const list: QRRSBlock[] = [];
    const length = rsBlock.length / 3;
    for (let i = 0; i < length; i++) {
      const count = rsBlock[i * 3 + 0];
      const totalCount = rsBlock[i * 3 + 1];
      const dataCount = rsBlock[i * 3 + 2];
      for (let j = 0; j < count; j++) {
        list.push(new QRRSBlock(totalCount, dataCount));
      }
    }
    return list;
  }
}

class QRBitBuffer {
  buffer: number[];
  length: number;
  constructor() {
    this.buffer = [];
    this.length = 0;
  }
  get(index: number): boolean {
    const bufIndex = Math.floor(index / 8);
    return ((this.buffer[bufIndex] >>> (7 - index % 8)) & 1) == 1;
  }
  put(num: number, length: number): void {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) == 1);
    }
  }
  getLengthInBits(): number {
    return this.length;
  }
  putBit(bit: boolean): void {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) this.buffer.push(0);
    if (bit) this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
    this.length++;
  }
}

class QRPolynomial {
  num: number[];
  constructor(num: number[], shift: number) {
    let offset = 0;
    while (offset < num.length && num[offset] == 0) offset++;
    this.num = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
  }
  get(index: number): number { return this.num[index]; }
  getLength(): number { return this.num.length; }
  multiply(e: QRPolynomial): QRPolynomial {
    const num = new Array(this.getLength() + e.getLength() - 1);
    for (let i = 0; i < num.length; i++) num[i] = 0;
    for (let i = 0; i < this.getLength(); i++) {
      for (let j = 0; j < e.getLength(); j++) {
        if (this.get(i) !== 0 && e.get(j) !== 0) {
          num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
        }
      }
    }
    return new QRPolynomial(num, 0);
  }
  mod(e: QRPolynomial): QRPolynomial {
    if (this.getLength() - e.getLength() < 0) return this;
    const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
    const num = new Array(this.getLength());
    for (let i = 0; i < this.getLength(); i++) num[i] = this.get(i);
    for (let i = 0; i < e.getLength(); i++) {
      num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
    }
    return new QRPolynomial(num, 0).mod(e);
  }
}

class QRMath {
  static EXP_TABLE = new Array<number>(256);
  static LOG_TABLE = new Array<number>(256);
  static initialize() {
    let num = 1;
    for (let i = 0; i < 256; i++) {
      QRMath.EXP_TABLE[i] = num;
      QRMath.LOG_TABLE[num] = i;
      num <<= 1;
      if (num & 256) {
        num ^= 285;
      }
    }
  }
  static glog(n: number): number {
    if (n < 1) return 0;
    return QRMath.LOG_TABLE[n] || 0;
  }
  static gexp(n: number): number {
    let val = n;
    while (val < 0) val += 255;
    while (val >= 255) val -= 255;
    return QRMath.EXP_TABLE[val];
  }
}
QRMath.initialize();

const QRUtil = {
  PATTERN_POSITION_TABLE: [
    [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
    [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]
  ] as number[][],
  G15: (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
  G18: (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
  G15_MASK: (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1),
  getBCHTypeInfo: function(data: number) {
    let d = data << 10;
    while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
      d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15)));
    }
    return ((data << 10) | d) ^ QRUtil.G15_MASK;
  },
  getBCHTypeNumber: function(data: number) {
    let d = data << 12;
    while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
      d ^= (QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18)));
    }
    return (data << 12) | d;
  },
  getBCHDigit: function(data: number) {
    let digit = 0;
    let temp = data;
    while (temp != 0) {
      digit++;
      temp >>>= 1;
    }
    return digit;
  },
  getPatternPosition: function(typeNumber: number) {
    return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1] || [];
  },
  getMask: function(maskPattern: number, i: number, j: number): boolean {
    switch (maskPattern) {
      case 0: return (i + j) % 2 == 0;
      case 1: return i % 2 == 0;
      case 2: return j % 3 == 0;
      case 3: return (i + j) % 3 == 0;
      case 4: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0;
      case 5: return (i * j) % 2 + (i * j) % 3 == 0;
      case 6: return ((i * j) % 2 + (i * j) % 3) % 2 == 0;
      case 7: return ((i * j) % 3 + (i + j) % 2) % 2 == 0;
      default: throw new Error("bad maskPattern:" + maskPattern);
    }
  },
  getErrorCorrectPolynomial: function(errorCorrectLength: number): QRPolynomial {
    let a = new QRPolynomial([1], 0);
    for (let i = 0; i < errorCorrectLength; i++) {
      a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
    }
    return a;
  },
  getLengthInBits: function(_mode: number, type: number): number {
    if (1 <= type && type < 10) return 8;
    return 16;
  },
  getLostPoint: function(qrCode: QRCodeModel): number {
    const moduleCount = qrCode.getModuleCount();
    let lostPoint = 0;
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        let sameCount = 0;
        const dark = qrCode.isDark(row, col);
        for (let r = -1; r <= 1; r++) {
          if (row + r < 0 || moduleCount <= row + r) continue;
          for (let c = -1; c <= 1; c++) {
            if (col + c < 0 || moduleCount <= col + c) continue;
            if (r == 0 && c == 0) continue;
            if (dark == qrCode.isDark(row + r, col + c)) sameCount++;
          }
        }
        if (sameCount > 5) lostPoint += (3 + sameCount - 5);
      }
    }
    return lostPoint;
  }
};

class QRCodeModel {
  typeNumber: number;
  errorCorrectionLevel: string;
  modules: (boolean | null)[][] | null;
  moduleCount: number;
  dataCache: number[] | null;
  dataList: QR8BitByte[];

  constructor(typeNumber: number, errorCorrectionLevel: string) {
    this.typeNumber = typeNumber;
    this.errorCorrectionLevel = errorCorrectionLevel;
    this.modules = null;
    this.moduleCount = 0;
    this.dataCache = null;
    this.dataList = [];
  }

  addData(data: string): void {
    this.dataList.push(new QR8BitByte(data));
    this.dataCache = null;
  }

  isDark(row: number, col: number): boolean {
    if (!this.modules || row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
      throw new Error(row + "," + col);
    }
    return !!this.modules[row][col];
  }

  getModuleCount(): number {
    return this.moduleCount;
  }

  make(): void {
    this.makeImpl(false, this.getBestMaskPattern());
  }

  makeImpl(test: boolean, maskPattern: number): void {
    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = new Array(this.moduleCount);
    for (let row = 0; row < this.moduleCount; row++) {
      this.modules[row] = new Array(this.moduleCount);
      for (let col = 0; col < this.moduleCount; col++) {
        this.modules[row][col] = null;
      }
    }
    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(test, maskPattern);
    if (this.typeNumber >= 7) {
      this.setupTypeNumber(test);
    }
    if (this.dataCache == null) {
      this.dataCache = QRCodeModel.createData(this.typeNumber, this.errorCorrectionLevel, this.dataList);
    }
    this.mapData(this.dataCache, maskPattern);
  }

  setupPositionProbePattern(row: number, col: number): void {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || this.moduleCount <= row + r) continue;
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || this.moduleCount <= col + c) continue;
        if ((0 <= r && r <= 6 && (c == 0 || c == 6)) || (0 <= c && c <= 6 && (r == 0 || r == 6)) || (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
          this.modules![row + r][col + c] = true;
        } else {
          this.modules![row + r][col + c] = false;
        }
      }
    }
  }

  getBestMaskPattern(): number {
    let minLostPoint = 0;
    let pattern = 0;
    for (let i = 0; i < 8; i++) {
      this.makeImpl(true, i);
      const lostPoint = QRUtil.getLostPoint(this);
      if (i == 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint;
        pattern = i;
      }
    }
    return pattern;
  }

  setupTimingPattern(): void {
    for (let r = 8; r < this.moduleCount - 8; r++) {
      if (this.modules![r][6] != null) continue;
      this.modules![r][6] = (r % 2 == 0);
    }
    for (let c = 8; c < this.moduleCount - 8; c++) {
      if (this.modules![6][c] != null) continue;
      this.modules![6][c] = (c % 2 == 0);
    }
  }

  setupPositionAdjustPattern(): void {
    const pos = QRUtil.getPatternPosition(this.typeNumber);
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        const row = pos[i];
        const col = pos[j];
        if (this.modules![row][col] != null) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            if (r == -2 || r == 2 || c == -2 || c == 2 || (r == 0 && c == 0)) {
              this.modules![row + r][col + c] = true;
            } else {
              this.modules![row + r][col + c] = false;
            }
          }
        }
      }
    }
  }

  setupTypeNumber(test: boolean): void {
    const bits = QRUtil.getBCHTypeNumber(this.typeNumber);
    for (let i = 0; i < 18; i++) {
      const mod = (!test && ((bits >> i) & 1) == 1);
      this.modules![Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
    }
    for (let i = 0; i < 18; i++) {
      const mod = (!test && ((bits >> i) & 1) == 1);
      this.modules![i % 3 + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
    }
  }

  setupTypeInfo(test: boolean, maskPattern: number): void {
    const data = (QRErrorCorrectionLevel.M << 3) | maskPattern;
    const bits = QRUtil.getBCHTypeInfo(data);
    for (let i = 0; i < 15; i++) {
      const mod = (!test && ((bits >> i) & 1) == 1);
      if (i < 6) {
        this.modules![i][8] = mod;
      } else if (i < 8) {
        this.modules![i + 1][8] = mod;
      } else {
        this.modules![this.moduleCount - 15 + i][8] = mod;
      }
    }
    for (let i = 0; i < 15; i++) {
      const mod = (!test && ((bits >> i) & 1) == 1);
      if (i < 8) {
        this.modules![8][this.moduleCount - i - 1] = mod;
      } else if (i < 9) {
        this.modules![8][15 - i - 1 + 1] = mod;
      } else {
        this.modules![8][15 - i - 1] = mod;
      }
    }
    this.modules![this.moduleCount - 8][8] = (!test);
  }

  mapData(data: number[], maskPattern: number): void {
    let inc = -1;
    let row = this.moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;
    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col == 6) col--;
      while (true) {
        for (let c = 0; c < 2; c++) {
          if (this.modules![row][col - c] == null) {
            let dark = false;
            if (byteIndex < data.length) {
              dark = (((data[byteIndex] >>> bitIndex) & 1) == 1);
            }
            const mask = QRUtil.getMask(maskPattern, row, col - c);
            if (mask) dark = !dark;
            this.modules![row][col - c] = dark;
            bitIndex--;
            if (bitIndex == -1) {
              byteIndex++;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }

  static createData(typeNumber: number, errorCorrectionLevel: string, dataList: QR8BitByte[]): number[] {
    const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);
    const buffer = new QRBitBuffer();
    for (let i = 0; i < dataList.length; i++) {
      const data = dataList[i];
      buffer.put(data.mode, 4);
      buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber));
      data.write(buffer);
    }
    let totalDataCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) {
      totalDataCount += rsBlocks[i].dataCount;
    }
    if (buffer.getLengthInBits() > totalDataCount * 8) {
      throw new Error("code length overflow");
    }
    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
      buffer.put(0, 4);
    }
    while (buffer.getLengthInBits() % 8 != 0) {
      buffer.putBit(false);
    }
    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(0xec, 8);
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(0x11, 8);
    }
    return QRCodeModel.createBytes(buffer, rsBlocks);
  }

  static createBytes(buffer: QRBitBuffer, rsBlocks: QRRSBlock[]): number[] {
    let offset = 0;
    let maxDcCount = 0;
    let maxEcCount = 0;
    const dcdata = new Array<number[]>(rsBlocks.length);
    const ecdata = new Array<number[]>(rsBlocks.length);
    for (let r = 0; r < rsBlocks.length; r++) {
      const dcCount = rsBlocks[r].dataCount;
      const ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);
      dcdata[r] = new Array<number>(dcCount);
      for (let i = 0; i < dcdata[r].length; i++) {
        dcdata[r][i] = 0xff & buffer.buffer[i + offset];
      }
      offset += dcCount;
      const rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
      const rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
      const modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = new Array<number>(rsPoly.getLength() - 1);
      for (let i = 0; i < ecdata[r].length; i++) {
        const modIndex = i + modPoly.getLength() - ecdata[r].length;
        ecdata[r][i] = (modIndex >= 0) ? modPoly.get(modIndex) : 0;
      }
    }
    let totalCodeCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) {
      totalCodeCount += rsBlocks[i].totalCount;
    }
    const data = new Array<number>(totalCodeCount);
    let index = 0;
    for (let i = 0; i < maxDcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < dcdata[r].length) {
          data[index++] = dcdata[r][i];
        }
      }
    }
    for (let i = 0; i < maxEcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < ecdata[r].length) {
          data[index++] = ecdata[r][i];
        }
      }
    }
    return data;
  }
}
