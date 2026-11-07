import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('js/app.js', 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(ids.length, new Set(ids).size, 'Không được trùng id');
for (const match of app.matchAll(/\$\('([^']+)'\)/g)) {
    // Các id cũ nằm sau toán tử fallback vẫn được giữ để tương thích.
    const legacy = ['sutraInfo', 'meritNum', 'levelNum', 'playerTitle', 'xpBar', 'chkVoice',
        'userNameLabel', 'btnCloseName', 'txtNameInput', 'zoneTitle', 'zoneDesc', 'btnZoneAction',
        'txtWishInput', 'wishList', 'joystickKnob', 'btnCloseSheet'];
    assert.ok(ids.includes(match[1]) || legacy.includes(match[1]), `Thiếu id ${match[1]}`);
}
for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    const path = match[1];
    if (!/^(https?:|data:)/.test(path)) assert.ok(fs.existsSync(path), `Thiếu tài nguyên ${path}`);
}
assert.ok(!app.includes('fakeOnline'), 'Không còn số online giả');
assert.match(html, /id="prayerSection" class="prayer-box hidden"/);
assert.equal([...html.matchAll(/data-devotion=/g)].length, 6);

let stored = null;
const storageSource = fs.readFileSync('js/storage.js', 'utf8').replace(/export /g, '');
const context = vm.createContext({
    structuredClone, Date, JSON, localStorage: {
        getItem: () => stored,
        setItem: (_, value) => { stored = value; },
        removeItem: () => { stored = null; }
    }
});
vm.runInContext(storageSource, context);
const load = () => JSON.parse(JSON.stringify(vm.runInContext('load()', context)));
assert.deepEqual(load().wishes, [], 'Không gieo lời nguyện mẫu');
stored = JSON.stringify({
    wishes: [
        { name: 'Mẫu', text: 'Dữ liệu mẫu' },
        { id: 123, name: 'Người dùng', text: 'Lời nguyện đã lưu' }
    ]
});
assert.equal(load().wishes.length, 1, 'Chỉ giữ lời người dùng từ bản cũ');
assert.equal(load().wishes[0].id, 123);
stored = JSON.stringify({ wishes: [], wishesVersion: 1 });
assert.deepEqual(load().wishes, [], 'Danh sách rỗng không bị thay bằng dữ liệu mẫu');
stored = '{broken';
assert.deepEqual(load().wishes, [], 'Dữ liệu lỗi trở về mặc định an toàn');

console.log('PASS: id duy nhất, nút HUD, tài nguyên cục bộ, trạng thái online và migration lời nguyện.');
