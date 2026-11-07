import fs from 'node:fs';
function edit(file, pairs) {
    let s = fs.readFileSync(file, 'utf8');
    for (const [a, b] of pairs) {
        if (!s.includes(a)) throw Error(`${file}: missing ${a}`);
        s = s.replace(a, b);
    }
    fs.writeFileSync(file, s);
}
edit('js/scene.js', [
    ['  if (isMoving) {\n    const dir', '  if (isMoving) {\n    standUp();\n    player.position.y = .09;\n    const dir'],
    ['    player.userData.armL.rotation.set(0.7, 0, 0.45);\n    player.userData.armR.rotation.set(0.7, 0, -0.45);', '    if (!player.userData.seated) {\n      player.userData.armL.rotation.set(.12, 0, .3);\n      player.userData.armR.rotation.set(.12, 0, -.3);\n    }'],
    ['targetPosition = null; // Ưu tiên joystick', 'targetPosition = null; pendingSeat = null; // Ưu tiên joystick'],
    ['      targetPosition = null;\n    }\n  });', '      targetPosition = null; pendingSeat = null;\n    }\n  });']
]);
edit('js/storage.js', [
    ["  playerName: 'Quảng Hạnh 55',", "  playerName: 'Quảng Hạnh 55',\n  avatar: 'novice',"],
    ['  data.settings =', "  data.avatar = ['novice', 'male', 'female'].includes(data.avatar) ? data.avatar : 'novice';\n  data.settings ="]
]);
edit('js/app.js', [
    ['initScene, createCharacterPreview,', 'initScene, setPlayerAvatar, meditateNearest, createCharacterPreview,'],
    ['      initScene(el.canvas, state.data.settings.quality);', '      initScene(el.canvas, state.data.settings.quality);\n      setPlayerAvatar(state.data.avatar);'],
    ["createCharacterPreview($('characterPreview'))", "createCharacterPreview($('characterPreview'), state.data.avatar)"],
    ["  $('btnCloseCharacter')?.addEventListener('click', closePreview);", `  const avatarLabels = { novice: 'Tiểu tăng · Áo hoàng y', male: 'Phật tử nam · Áo lam', female: 'Phật tử nữ · Tóc búi' };
  const renderAvatarSelection = () => {
    document.querySelectorAll('[data-avatar]').forEach(button => {
      const active = button.dataset.avatar === state.data.avatar;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('characterLabel').textContent = avatarLabels[state.data.avatar];
  };
  renderAvatarSelection();
  document.querySelectorAll('[data-avatar]').forEach(button => {
    button.addEventListener('click', () => {
      state.data.avatar = button.dataset.avatar;
      Store.save(state.data);
      setPlayerAvatar(state.data.avatar);
      renderAvatarSelection();
      disposePreview?.(); disposePreview = null;
      try { disposePreview = createCharacterPreview($('characterPreview'), state.data.avatar); }
      catch (error) { console.warn(error); toast('Không thể mở xem trước 3D'); }
    });
  });
  $('btnMeditate')?.addEventListener('click', () => {
    meditateNearest(); toast('Đang đến đệm thiền gần nhất · Di chuyển để đứng dậy');
  });
  $('btnCloseCharacter')?.addEventListener('click', closePreview);`],
    ["  if (k === 'bellTower' || k === 'thapchuong') {", "  if (k === 'meditation' || k === 'garden') {\n    meditateNearest();\n    toast('Đang đến đệm thiền · Dùng phím di chuyển để đứng dậy');\n  } else if (k === 'bellTower' || k === 'thapchuong') {"],
    ["  } else {\n    if (el.zoneDesc) el.zoneDesc.textContent = 'Khuôn viên thanh tịnh bình an.';", "  } else if (key === 'meditation' || key === 'garden') {\n    if (el.zoneDesc) el.zoneDesc.textContent = zone.desc;\n    if (el.btnZoneAction) el.btnZoneAction.textContent = 'Ngồi thiền';\n  } else {\n    if (el.zoneDesc) el.zoneDesc.textContent = 'Khuôn viên thanh tịnh bình an.';"]
]);
edit('index.html', [
    ['<p>Chú tiểu · Áo hoàng y</p>', `<p id="characterLabel">Tiểu tăng · Áo hoàng y</p>
      <div class="avatar-options" aria-label="Chọn nhân vật">
        <button data-avatar="novice" aria-pressed="true">Tiểu tăng</button>
        <button data-avatar="male" aria-pressed="false">Phật tử nam</button>
        <button data-avatar="female" aria-pressed="false">Phật tử nữ</button>
      </div>`],
    ['aria-label="Chú tiểu chibi áo vàng, tràng hạt gỗ"', 'aria-label="Xem trước nhân vật chibi đã chọn"'],
    ['<nav id="quickNav" aria-label="Đi đến thiền viện">', `<nav id="quickNav" aria-label="Đi đến thiền viện">
      <button class="nav-chip" data-loc="meditation">🧘 Sân thiền</button>
      <button class="nav-chip" data-loc="garden">🌿 Vườn thiền</button>`],
    ['<nav class="utility-dock" aria-label="Công cụ cá nhân">', `<nav class="utility-dock" aria-label="Công cụ cá nhân">
      <button id="btnMeditate" title="Đi đến đệm thiền gần nhất"><span>🧘</span>Ngồi thiền</button>`]
]);
edit('sw.js', [
    ['niemphat-v2-garden', 'niemphat-v3-campus-chibi'],
    ["  './js/scene.js',", "  './js/scene.js',\n  './js/characters.js',\n  './js/campus.js',"]
]);
console.log('Integrated campus, characters and UI');
