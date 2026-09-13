const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

const root = path.resolve(__dirname, '..');
const htmlFiles = [
  'index.html',
  ...fs.readdirSync(path.join(root, 'chapters')).filter(x => x.endsWith('.html')).map(x => `chapters/${x}`),
  ...fs.readdirSync(path.join(root, 'appendices')).filter(x => x.endsWith('.html')).map(x => `appendices/${x}`)
];

const formalStudentHashes = {
  '.env.example': '8b1f32f6e3bb62466879a8ef83e75fc81cdd26f2166a944240d99a80185f51f6',
  '.gitignore': 'b93b6598c404c03a40eb612a176eec8a00b688042869fa6ccf50950ebc96a8ed',
  'app.py': 'b771e06575f7e22eeee976398291952c3de474421b9dd89840af29ccc48a5364',
  'config.py': 'c18a3dd038c6c92331ea568014337190155d3f36d7394590567e257429c23843',
  'email_service.py': 'c7016886a1bb1b62a2efa0c039a79df7e59aed03ac425c95b17a6c38d74fd490',
  'index.py': 'd4fd34b5aa8277c1efced3b358aa42f72e1febfa965f7768bd61e6f8d4d99cc8',
  'line_client.py': 'c731c19970160a7b366583bed3a929d0384d5383930edebdea680c9d4f8b941d',
  'line_utils.py': 'eaec38d7a5eee7a026278e8779428cd20b446ab5f3150649c800b45b89286792',
  'main.py': 'dd410ae68333493a62c5d37ccea9288f873af5ad8e5ed25a4e7ecbf255234951',
  'message_service.py': '94659087b765cf7ab30b1e9aade1e9a573ed2b7712f1a3c94d19b8d70c2ccc27',
  'README.md': '96a388c99122b3b25402a9a96ddc2996f9e47c44568ff9053134c09fd730cc4c',
  'requirements.txt': '0df175d04ffbc50eae9ff09f9514cb81c2620f1c00801b1052d544633399cabf',
  'sheets_store.py': '8827b41ee958db3c109fcad903833ed3e632726c8dd5cf7073e2590c2caee8ab',
  'vercel.json': '99cc91956fd2ac8a511a32dee2dfff44705defc5e441793562ccdd68b359d4f6'
};
const formalZipHash = '00c77be8e0ec5459f6e33a3f4a9725a7f2560dea40034d47993dee2c92fb363f';

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function readZipEntries(zipPath) {
  const zip = fs.readFileSync(zipPath);
  let eocd = -1;
  for (let offset = zip.length - 22; offset >= Math.max(0, zip.length - 65557); offset -= 1) {
    if (zip.readUInt32LE(offset) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  assert.notEqual(eocd, -1, 'ZIP end-of-central-directory record missing');

  const entryCount = zip.readUInt16LE(eocd + 10);
  let offset = zip.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let index = 0; index < entryCount; index += 1) {
    assert.equal(zip.readUInt32LE(offset), 0x02014b50, `ZIP central-directory entry ${index} invalid`);
    const method = zip.readUInt16LE(offset + 10);
    const compressedSize = zip.readUInt32LE(offset + 20);
    const uncompressedSize = zip.readUInt32LE(offset + 24);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const localOffset = zip.readUInt32LE(offset + 42);
    const name = zip.subarray(offset + 46, offset + 46 + nameLength).toString('utf8').replaceAll('\\', '/');

    assert.equal(zip.readUInt32LE(localOffset), 0x04034b50, `${name}: local header invalid`);
    const localNameLength = zip.readUInt16LE(localOffset + 26);
    const localExtraLength = zip.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = zip.subarray(dataOffset, dataOffset + compressedSize);
    const data = method === 0 ? compressed : method === 8 ? zlib.inflateRawSync(compressed) : null;
    assert.ok(data, `${name}: unsupported ZIP compression method ${method}`);
    assert.equal(data.length, uncompressedSize, `${name}: uncompressed size mismatch`);
    assert.ok(!entries.has(name), `${name}: duplicate ZIP entry`);
    entries.set(name, data);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

test('每個 HTML 頁都有響應式 viewport、共用樣式與共用互動程式', () => {
  for (const relative of htmlFiles) {
    const text = fs.readFileSync(path.join(root, relative), 'utf8');
    assert.match(text, /name="viewport"/i, relative);
    assert.match(text, /assets\/styles\.css/, relative);
    assert.match(text, /assets\/app\.js/, relative);
  }
});

test('所有本地 href 都指向存在的檔案', () => {
  for (const relative of htmlFiles) {
    const text = fs.readFileSync(path.join(root, relative), 'utf8');
    const hrefs = [...text.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
    for (const href of hrefs) {
      if (/^(https?:|#|mailto:)/.test(href)) continue;
      const clean = href.split('#')[0].split('?')[0];
      if (!clean) continue;
      const target = path.resolve(path.dirname(path.join(root, relative)), clean);
      assert.ok(fs.existsSync(target), `${relative} -> ${href} missing`);
    }
  }
});

test('正式學生 ZIP 是 14 個正式原檔的平鋪、安全且逐位元相同封裝', () => {
  const zipPath = path.join(root, 'downloads', 'LINE訊息整理Bot_課程正式版.zip');
  assert.ok(fs.existsSync(zipPath), 'downloads/LINE訊息整理Bot_課程正式版.zip missing');
  assert.equal(sha256(fs.readFileSync(zipPath)), formalZipHash, 'download ZIP differs from the supplied archive');
  const entries = readZipEntries(zipPath);
  const expectedNames = Object.keys(formalStudentHashes).sort();
  assert.deepEqual([...entries.keys()].sort(), expectedNames, 'ZIP manifest must contain only the 14 root files');

  for (const name of expectedNames) {
    assert.equal(name.includes('/'), false, `${name}: ZIP must not contain a wrapper directory`);
    assert.equal(sha256(entries.get(name)), formalStudentHashes[name], `${name}: ZIP differs from supplied archive`);
    const starter = fs.readFileSync(path.join(root, 'downloads', 'line-bot-starter', name));
    assert.equal(sha256(starter), formalStudentHashes[name], `${name}: starter differs from supplied archive`);
    assert.deepEqual(entries.get(name), starter, `${name}: ZIP and starter differ`);
  }

  const forbidden = /(^|\/)(\.env|\.git|\.venv|__pycache__|tests)(\/|$)|service[^/]*account[^/]*\.json$|\.(tmp|temp|pyc)$/i;
  assert.equal([...entries.keys()].filter(name => forbidden.test(name)).length, 0, 'ZIP contains excluded files');
});

test('每個複製按鈕都有同頁唯一目標', () => {
  for (const relative of htmlFiles) {
    const text = fs.readFileSync(path.join(root, relative), 'utf8');
    const targets = [...text.matchAll(/data-copy-target="([^"]+)"/g)].map(match => match[1]);
    for (const id of targets) {
      assert.equal((text.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, `${relative}: ${id}`);
    }
  }
});

test('13 節都有唯一 progress id 且互動程式語法正確', () => {
  const ids = [];
  for (const relative of htmlFiles.filter(file => file.startsWith('chapters/'))) {
    const text = fs.readFileSync(path.join(root, relative), 'utf8');
    const matches = [...text.matchAll(/data-progress-id="([^"]+)"/g)];
    assert.equal(matches.length, 1, relative);
    ids.push(matches[0][1]);
  }
  assert.equal(new Set(ids).size, 13);
  new vm.Script(fs.readFileSync(path.join(root, 'assets/app.js'), 'utf8'));
});

test('CSS 包含桌面側欄與手機抽屜斷點且括號平衡', () => {
  const css = fs.readFileSync(path.join(root, 'assets/styles.css'), 'utf8');
  assert.match(css, /\.sidebar\{/);
  assert.match(css, /@media\(max-width:980px\)/);
  assert.match(css, /\.mobile-drawer/);
  assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length);
});
