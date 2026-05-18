(() => {
  const EGG_GROUPS = [
    "动物组", "拟人组", "巨灵组", "魔力组", "天空组", "两栖组", "植物组",
    "大地组", "妖精组", "昆虫组", "软体组", "机械组", "海洋组", "龙组"
  ];

  const DEBUG_MANDATORY_PRESET = [
    // { gender: 1, eggGroups: ["动物组"], remark: "异色恶魔狼" }
  ];

  const DEBUG_OPTIONAL_PRESET = [
    // { gender: 0, eggGroups: ["动物组", "巨灵组"], remark: "月牙雪熊", reusable: 2 }
  ];

  const DEBUG_ONLY_FROM_OPTIONAL = false;

  const MandatorySprites = [];
  let mandatoryIdCounter = 0;
  const OptionalSprites = [];
  let optionalIdCounter = 0;

  function normalizeGender(value) {
    return value === 1 ? 1 : 0;
  }

  function normalizeRemark(value) {
    return String(value || "").trim().slice(0, 8);
  }

  function normalizeEggGroups(value) {
    return Array.isArray(value) ? value.filter(group => EGG_GROUPS.includes(group)) : [];
  }

  function createSprite(type, overrides = {}) {
    return {
      id: getSpriteTypeConfig(type).nextId(),
      gender: 0,
      eggGroups: [],
      remark: "",
      ...(type === "optional" ? { reusable: 1 } : {}),
      ...overrides
    };
  }

  const SPRITE_CONFIG = {
    mandatory: {
      list: MandatorySprites,
      nextId: () => ++mandatoryIdCounter,
      triggerPrefix: "egg-trigger-",
      dropdownPrefix: "egg-dropdown-",
      datasetId: String,
      rowClass: "mandatory-sprite-row",
      labelPrefix: "精灵",
      listId: "mandatory-list",
      withReusable: false,
      render: () => renderSpriteList("mandatory")
    },
    optional: {
      list: OptionalSprites,
      nextId: () => ++optionalIdCounter,
      triggerPrefix: "opt-egg-trigger-",
      dropdownPrefix: "opt-egg-dropdown-",
      datasetId: id => `opt-${id}`,
      rowClass: "mandatory-sprite-row optional-sprite-row",
      labelPrefix: "可选",
      listId: "optional-list",
      withReusable: true,
      render: () => renderSpriteList("optional")
    }
  };

  function canBreed(groupsA, groupsB) {
    if (groupsA === null || groupsB === null) return true;
    return groupsA.some(g => groupsB.includes(g));
  }

  function countEdgesWithGroups(type0, type1, groups0, groups1) {
    let count = 0;
    for (let i = 0; i < type0.length; i++) {
      for (let j = 0; j < type1.length; j++) {
        if (manhattanDistance(type0[i], type1[j]) <= MANHATTAN_THRESHOLD &&
          canBreed(groups0 ? groups0[i] : null, groups1 ? groups1[j] : null)) {
          count++;
        }
      }
    }
    return count;
  }

  function countIncompatibleMandatory(sprites) {
    const females = sprites.filter(s => s.gender === 0);
    const males = sprites.filter(s => s.gender === 1);
    let incompatible = 0;
    for (const f of females) {
      for (const m of males) {
        if (!canBreed(f.eggGroups, m.eggGroups)) incompatible++;
      }
    }
    return incompatible;
  }

  function getSpriteTypeConfig(type) {
    return SPRITE_CONFIG[type === "optional" ? "optional" : "mandatory"];
  }

  function findSprite(type, id) {
    return getSpriteTypeConfig(type).list.find(s => s.id === id) || null;
  }

  function setSpriteField(type, id, key, value) {
    const sprite = findSprite(type, id);
    if (!sprite) return null;
    sprite[key] = value;
    return sprite;
  }

  function updateSpriteRemark(type, id, text) {
    setSpriteField(type, id, "remark", normalizeRemark(text));
  }

  function removeSprite(type, id) {
    const cfg = getSpriteTypeConfig(type);
    const idx = cfg.list.findIndex(s => s.id === id);
    if (idx !== -1) cfg.list.splice(idx, 1);
    cfg.render();
  }

  function updateEggGroupTrigger(type, id, eggGroups) {
    const cfg = getSpriteTypeConfig(type);
    const trigger = document.getElementById(`${cfg.triggerPrefix}${id}`);
    if (!trigger) return;
    const label = eggGroups.length === 0
      ? "选择蛋组（至少1个）"
      : eggGroups.join(", ");
    trigger.querySelector(".egg-trigger-text").textContent = label;
    trigger.classList.toggle("empty", eggGroups.length === 0);
    trigger.classList.toggle("has-error", eggGroups.length === 0);
  }

  function closeEggGroupDropdowns(activeId = null) {
    document.querySelectorAll(".egg-group-dropdown.open").forEach(el => {
      if (activeId === null || el.dataset.spriteId !== activeId) {
        el.classList.remove("open");
      }
    });
  }

  function toggleSpriteEggGroup(type, id, group) {
    const sprite = findSprite(type, id);
    if (!sprite) return;
    const idx = sprite.eggGroups.indexOf(group);
    if (idx === -1) sprite.eggGroups.push(group);
    else sprite.eggGroups.splice(idx, 1);
    updateEggGroupTrigger(type, id, sprite.eggGroups);
    updateOptionalInfo();
  }

  function toggleSpriteEggGroupDropdown(type, id) {
    const cfg = getSpriteTypeConfig(type);
    closeEggGroupDropdowns(cfg.datasetId(id));
    const dropdown = document.getElementById(`${cfg.dropdownPrefix}${id}`);
    if (dropdown) dropdown.classList.toggle("open");
  }

  function normalizeOptionalReuseCount(value) {
    if (value === true) return 2;
    if (value === false || value === null || value === undefined || value === "") return 1;
    const count = parseInt(value, 10);
    return Number.isFinite(count) && count >= 1 ? count : 1;
  }

  function setOptionalReuseCount(id, value) {
    const count = normalizeOptionalReuseCount(value);
    return setSpriteField("optional", id, "reusable", count) ? count : 1;
  }

  function adjustOptionalReuseCount(id, delta) {
    const sprite = findSprite("optional", id);
    if (!sprite) return 1;
    return setOptionalReuseCount(id, normalizeOptionalReuseCount(sprite.reusable) + delta);
  }

  function addSprite(type) {
    const cfg = getSpriteTypeConfig(type);
    const n = parseInt(document.getElementById("input-n").value) || 0;
    if (type === "mandatory" && cfg.list.length >= n) {
      alert(`必选精灵数量不能超过小窝总数（${n}）`);
      return;
    }
    cfg.list.push(createSprite(type));
    cfg.render();
  }

  function updateOptionalPoolControls() {
    const onlyFromOptionalEl = document.getElementById("chk-only-optional");
    if (!onlyFromOptionalEl) return;
    const hasOptional = OptionalSprites.length > 0;
    onlyFromOptionalEl.disabled = !hasOptional;
    if (!hasOptional) {
      onlyFromOptionalEl.checked = false;
    }
  }

  function createGenderToggle(type, sprite) {
    const cfg = getSpriteTypeConfig(type);
    const genderToggle = document.createElement("div");
    genderToggle.className = "gender-toggle";

    [
      [0, "♀", "active-female"],
      [1, "♂", "active-male"]
    ].forEach(([gender, text, activeClass]) => {
      const button = document.createElement("button");
      button.className = `gender-btn${sprite.gender === gender ? ` ${activeClass}` : ""}`;
      button.textContent = text;
      button.type = "button";
      button.onclick = () => {
        setSpriteField(type, sprite.id, "gender", gender);
        cfg.render();
      };
      genderToggle.appendChild(button);
    });

    return genderToggle;
  }

  function createEggGroupControl(type, sprite) {
    const cfg = getSpriteTypeConfig(type);
    const wrapper = document.createElement("div");
    wrapper.className = "egg-group-wrapper";

    const trigger = document.createElement("button");
    trigger.className = "egg-group-trigger" + (sprite.eggGroups.length === 0 ? " empty has-error" : "");
    trigger.id = `${cfg.triggerPrefix}${sprite.id}`;
    trigger.type = "button";
    trigger.onclick = e => {
      e.stopPropagation();
      toggleSpriteEggGroupDropdown(type, sprite.id);
    };

    const triggerText = document.createElement("span");
    triggerText.className = "egg-trigger-text";
    triggerText.textContent = sprite.eggGroups.length === 0
      ? "选择蛋组（至少1个）"
      : sprite.eggGroups.join(", ");
    trigger.appendChild(triggerText);

    const arrow = document.createElement("span");
    arrow.textContent = "▾";
    arrow.style.marginLeft = "4px";
    arrow.style.flexShrink = "0";
    trigger.appendChild(arrow);
    wrapper.appendChild(trigger);

    const dropdown = document.createElement("div");
    dropdown.className = "egg-group-dropdown";
    dropdown.id = `${cfg.dropdownPrefix}${sprite.id}`;
    dropdown.dataset.spriteId = cfg.datasetId(sprite.id);

    EGG_GROUPS.forEach(group => {
      const opt = document.createElement("label");
      opt.className = "egg-group-option";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = sprite.eggGroups.includes(group);
      cb.onchange = () => toggleSpriteEggGroup(type, sprite.id, group);
      opt.appendChild(cb);
      opt.appendChild(document.createTextNode(group));
      dropdown.appendChild(opt);
    });

    wrapper.appendChild(dropdown);
    return wrapper;
  }

  function createRemarkInput(type, sprite) {
    const input = document.createElement("input");
    input.className = "sprite-remark-input";
    input.type = "text";
    input.maxLength = 8;
    input.placeholder = "备注（可选）";
    input.value = sprite.remark || "";
    input.oninput = e => updateSpriteRemark(type, sprite.id, e.target.value);
    return input;
  }

  function bindReuseInput(input, spriteId) {
    const syncValue = value => {
      input.value = String(setOptionalReuseCount(spriteId, value));
    };
    input.oninput = e => syncValue(e.target.value);
    input.onchange = e => syncValue(e.target.value);
    return input;
  }

  function createReuseStepButton(text, title, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "optional-reuse-step-btn";
    button.textContent = text;
    button.title = title;
    button.onclick = onClick;
    return button;
  }

  function createOptionalReuseControl(sprite) {
    const label = document.createElement("label");
    label.className = "optional-reuse-label";

    const text = document.createElement("span");
    text.className = "optional-reuse-text";
    text.textContent = "数量";

    const stepper = document.createElement("div");
    stepper.className = "optional-reuse-stepper";

    const input = bindReuseInput(document.createElement("input"), sprite.id);
    input.type = "number";
    input.min = "1";
    input.step = "1";
    input.inputMode = "numeric";
    input.value = String(normalizeOptionalReuseCount(sprite.reusable));

    const step = delta => {
      input.value = String(adjustOptionalReuseCount(sprite.id, delta));
    };

    stepper.appendChild(createReuseStepButton("−", "减少 1", () => step(-1)));
    stepper.appendChild(input);
    stepper.appendChild(createReuseStepButton("+", "增加 1", () => step(1)));
    label.append(text, stepper);
    return label;
  }

  function createRemoveButton(type, spriteId) {
    const button = document.createElement("button");
    button.className = "btn-remove-sprite";
    button.textContent = "✕ 删除";
    button.type = "button";
    button.onclick = () => removeSprite(type, spriteId);
    return button;
  }

  function createSpriteRow(type, sprite, idx) {
    const cfg = getSpriteTypeConfig(type);
    const row = document.createElement("div");
    row.className = cfg.rowClass;

    const label = document.createElement("span");
    label.className = "sprite-label";
    label.textContent = `${cfg.labelPrefix} ${idx + 1}`;
    row.appendChild(label);

    row.append(
      createGenderToggle(type, sprite),
      createRemarkInput(type, sprite),
      createEggGroupControl(type, sprite)
    );

    if (cfg.withReusable) row.appendChild(createOptionalReuseControl(sprite));
    row.appendChild(createRemoveButton(type, sprite.id));

    return row;
  }

  function renderSpriteList(type) {
    const cfg = getSpriteTypeConfig(type);
    const list = document.getElementById(cfg.listId);
    if (!list) return;
    list.innerHTML = "";
    cfg.list.forEach((sprite, idx) => list.appendChild(createSpriteRow(type, sprite, idx)));
    if (type === "optional") updateOptionalPoolControls();
    updateOptionalInfo();
  }

  function getOptionalSelection(gender, needed, onlyFromOptional) {
    const pool = OptionalSprites.filter(s => s.gender === gender);
    const picked = [];

    for (const s of pool) {
      if (picked.length >= needed) break;
      const reuseCount = normalizeOptionalReuseCount(s.reusable);
      const takeCount = Math.min(reuseCount, needed - picked.length);
      for (let i = 0; i < takeCount; i++) {
        picked.push(s);
      }
    }

    if (picked.length < needed && onlyFromOptional) {
      return {
        ok: false,
        missing: needed - picked.length,
        selected: picked
      };
    }

    while (picked.length < needed) {
      picked.push(null);
    }

    return {
      ok: true,
      missing: 0,
      selected: picked
    };
  }

  function countSpritesByGender(list) {
    return list.reduce((counts, sprite) => {
      counts[sprite.gender === 0 ? "female" : "male"]++;
      return counts;
    }, { female: 0, male: 0 });
  }

  function hasEggGroups(sprite) {
    return sprite.eggGroups.length > 0;
  }

  function getOptionalPoolStats() {
    const counts = countSpritesByGender(OptionalSprites);
    return {
      total: OptionalSprites.length,
      female: counts.female,
      male: counts.male,
      reusable: OptionalSprites.reduce((sum, sprite) => sum + normalizeOptionalReuseCount(sprite.reusable), 0)
    };
  }

  function getSolveSetup() {
    const n = parseInt(document.getElementById("input-n").value) || 0;
    const k = parseInt(document.getElementById("input-k").value) || 0;
    const mandatoryCounts = countSpritesByGender(MandatorySprites);
    const onlyFromOptionalEl = document.getElementById("chk-only-optional");
    return {
      n,
      k,
      m: n - k,
      kMand: mandatoryCounts.female,
      mMand: mandatoryCounts.male,
      onlyFromOptional: !!(onlyFromOptionalEl && onlyFromOptionalEl.checked)
    };
  }

  function validateSolveSetup(setup) {
    if (setup.n < 2 || setup.n > 10) return "小窝总数必须在 2-10 之间";
    if (MandatorySprites.length > setup.n) {
      return `必选精灵数量（${MandatorySprites.length}）不能超过小窝总数（${setup.n}）`;
    }
    if (!MandatorySprites.every(hasEggGroups)) return "每个必选精灵至少需要选择1个蛋组";
    if (!OptionalSprites.every(hasEggGroups)) return "每个可选精灵至少需要选择1个蛋组";
    if (setup.k < 1 || setup.k >= setup.n) return "雌性精灵数量必须在 1 到 n-1 之间";
    if (setup.k < setup.kMand || setup.m < setup.mMand) {
      return `当前雌雄数量无法容纳必选精灵：必选至少需要 ♀${setup.kMand} / ♂${setup.mMand}，当前为 ♀${setup.k} / ♂${setup.m}`;
    }
    if (!setup.onlyFromOptional) return "";
    if (OptionalSprites.length === 0) {
      return "仅从可选精灵选择已启用，但可选精灵池为空。请先添加可选精灵。";
    }

    const femaleCheck = getOptionalSelection(0, setup.k - setup.kMand, true);
    const maleCheck = getOptionalSelection(1, setup.m - setup.mMand, true);
    if (femaleCheck.ok && maleCheck.ok) return "";

    return `仅从可选精灵选择已启用，可选池数量不足：雌性还缺 ${femaleCheck.ok ? 0 : femaleCheck.missing}，雄性还缺 ${maleCheck.ok ? 0 : maleCheck.missing}。`;
  }

  function updateOptionalInfo() {
    const infoEl = document.getElementById("optional-info");
    if (!infoEl) return;

    const poolInfoEl = document.getElementById("optional-pool-info");
    const setup = getSolveSetup();

    if (poolInfoEl) {
      const pool = getOptionalPoolStats();
      poolInfoEl.style.display = pool.total ? "block" : "none";
      if (pool.total) {
        poolInfoEl.textContent = `可选池共 ${pool.total} 个（♀${pool.female} / ♂${pool.male}，总可用次数 ${pool.reusable}）。当前模式：${setup.onlyFromOptional ? "仅从可选精灵选择" : "优先从可选精灵选择，不足自动补齐"}。`;
      }
    }

    if (MandatorySprites.length === 0) {
      infoEl.style.display = "none";
      const hint = document.getElementById("hint-k");
      if (hint) hint.textContent = "";
      updateType1Count();
      return;
    }

    const optF = setup.k - setup.kMand;
    const optM = setup.m - setup.mMand;
    const valid = setup.k >= setup.kMand && setup.m >= setup.mMand && setup.k > 0 && setup.m > 0;

    infoEl.style.display = "block";
    infoEl.classList.toggle("invalid", !valid);
    if (!valid) {
      infoEl.textContent = `当前数量不满足必选精灵：必选至少需要 ♀${setup.kMand} / ♂${setup.mMand}，当前为 ♀${setup.k} / ♂${setup.m}。`;
    } else {
      infoEl.textContent = `已有必选精灵：♀${setup.kMand} ♂${setup.mMand}。按当前设置将自动补充可选精灵：♀${optF} ♂${optM}（共 ${setup.k}♀ / ${setup.m}♂）。`;
    }

    const hint = document.getElementById("hint-k");
    if (hint) hint.textContent = "手动指定";
  }

  function ensureMandatorySection() {
    const inputPanel = document.querySelector(".input-panel");
    const inputSection = document.querySelector(".input-section");
    if (!inputPanel || !inputSection || document.querySelector(".mandatory-section")) return;

    const section = document.createElement("div");
    section.className = "mandatory-section";
    section.innerHTML = `
      <div class="mandatory-header">
        <span class="mandatory-title">必选精灵配置 <span class="mandatory-hint">指定必选精灵的性别和蛋组</span></span>
        <button class="btn-add-sprite" id="btn-add-sprite" type="button">＋ 添加必选精灵</button>
      </div>
      <div id="mandatory-list" class="mandatory-list"></div>
      <div id="optional-info" class="optional-info" style="display:none"></div>
      <div class="optional-sprites-section">
        <div class="mandatory-header">
          <span class="mandatory-title">可选精灵配置 <span class="mandatory-hint">指定优先可选精灵的性别、蛋组和最多使用数量</span></span>
          <button class="btn-add-sprite" id="btn-add-optional-sprite" type="button">＋ 添加可选精灵</button>
        </div>
        <div id="optional-list" class="mandatory-list"></div>
        <div class="optional-controls">
          <label class="optional-check-label"><input type="checkbox" id="chk-only-optional" disabled> 仅从可选精灵选择</label>
        </div>
        <div id="optional-pool-info" class="optional-pool-info" style="display:none"></div>
      </div>
    `;
    inputPanel.appendChild(section);
    document.getElementById("btn-add-sprite").addEventListener("click", () => addSprite("mandatory"));
    document.getElementById("btn-add-optional-sprite").addEventListener("click", () => addSprite("optional"));
    document.getElementById("chk-only-optional").addEventListener("change", updateOptionalInfo);
  }

  const _countEdges = countEdges;
  const _swapTypes = swapTypes;
  const _renderVisualization = renderVisualization;
  const _updateStats = updateStats;
  let vizObserver = null;
  let isAnnotating = false;
  let isSyncingViz = false;

  function getSolveContext() {
    return window.__solveContext || null;
  }

  function getRuntimeContext(type0, type1) {
    const solveCtx = getSolveContext();
    if (solveCtx && solveCtx.groups0 && solveCtx.groups1 &&
      solveCtx.groups0.length === type0.length && solveCtx.groups1.length === type1.length) {
      return solveCtx;
    }
    if (State.groups0 && State.groups1 &&
      State.groups0.length === type0.length && State.groups1.length === type1.length) {
      return {
        groups0: State.groups0,
        groups1: State.groups1,
        kMand: State.kMand || 0,
        mMand: State.mMand || 0
      };
    }
    return null;
  }

  countEdges = function(type0, type1) {
    const ctx = getRuntimeContext(type0, type1);
    if (!ctx) return _countEdges(type0, type1);
    return countEdgesWithGroups(type0, type1, ctx.groups0, ctx.groups1);
  };

  swapTypes = function(type0, type1) {
    if (type0.length === 0 || type1.length === 0) return null;
    const ctx = getRuntimeContext(type0, type1);
    if (!ctx) return _swapTypes(type0, type1);

    const opt0Start = ctx.kMand || 0;
    const opt1Start = ctx.mMand || 0;
    const opt0Count = type0.length - opt0Start;
    const opt1Count = type1.length - opt1Start;
    if (opt0Count <= 0 || opt1Count <= 0) return null;

    const c0 = type0.map(p => [...p]);
    const c1 = type1.map(p => [...p]);
    const i = opt0Start + Math.floor(Math.random() * opt0Count);
    const j = opt1Start + Math.floor(Math.random() * opt1Count);
    [c0[i], c1[j]] = [c1[j], c0[i]];
    return { type0: c0, type1: c1 };
  };

  function getNeedTag(type, index) {
    const kMand = State.kMand || 0;
    const mMand = State.mMand || 0;
    if (type === 0 && index < kMand) return "";
    if (type === 1 && index < mMand) return "";

    const oppositeMandatory = (type === 0)
      ? (State.groups1 || []).slice(0, mMand)
      : (State.groups0 || []).slice(0, kMand);
    if (oppositeMandatory.length === 0) return "";

    const union = new Set();
    oppositeMandatory.forEach(gs => {
      if (Array.isArray(gs)) gs.forEach(g => union.add(g));
    });

    if (union.size === 0 || union.size >= EGG_GROUPS.length) return "";
    const arr = Array.from(union);
    if (arr.length === 1) return `${arr[0]}`;
    if (arr.length <= 2) return `${arr.join("/")}`;
    return "多组";
  }

  function getEggBadge(type, index) {
    const groups = type === 0
      ? (State.groups0 ? State.groups0[index] : null)
      : (State.groups1 ? State.groups1[index] : null);
    if (Array.isArray(groups) && groups.length > 0) {
      return groups.join("/");
    }
    return getNeedTag(type, index);
  }

  function estimateBadgeWidth(text) {
    const contentWidth = Array.from(text).reduce((total, ch) => {
      return total + (/^[\u0000-\u00ff]$/.test(ch) ? 6 : 11);
    }, 0);
    return Math.max(48, contentWidth + 10);
  }

  function appendSvgBadge(groupEl, x, y, width, height, text, anchor) {
    if (!text) return;

    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const tx = document.createElementNS("http://www.w3.org/2000/svg", "text");
    bg.classList.add("custom-note-badge");
    tx.classList.add("custom-note-badge");
    const badgeWidth = estimateBadgeWidth(text);

    if (anchor === "left") {
      bg.setAttribute("x", String(x + 4));
      bg.setAttribute("y", String(y + 6));
      tx.setAttribute("x", String(x + 4 + badgeWidth / 2));
      tx.setAttribute("y", String(y + 18));
      tx.setAttribute("text-anchor", "middle");
    } else {
      bg.setAttribute("x", String(x + width - badgeWidth - 4));
      bg.setAttribute("y", String(y + height - 26));
      tx.setAttribute("x", String(x + width - 4 - badgeWidth / 2));
      tx.setAttribute("y", String(y + height - 14));
      tx.setAttribute("text-anchor", "middle");
    }

    bg.setAttribute("width", String(badgeWidth));
    bg.setAttribute("height", "16");
    bg.setAttribute("rx", "3");
    bg.setAttribute("fill", "rgba(15, 23, 42, 0.72)");
    bg.setAttribute("pointer-events", "none");
    groupEl.appendChild(bg);

    tx.setAttribute("fill", "#f8fafc");
    tx.setAttribute("font-size", "11");
    tx.setAttribute("font-weight", "700");
    tx.setAttribute("pointer-events", "none");
    tx.textContent = text;
    groupEl.appendChild(tx);
  }

  function filterVisualizationLines() {
    const svg = document.querySelector("#viz-container svg");
    if (!svg || !State.type0 || !State.type1) return;

    const allowed = new Set();
    for (let i = 0; i < State.type0.length; i++) {
      for (let j = 0; j < State.type1.length; j++) {
        if (manhattanDistance(State.type0[i], State.type1[j]) > MANHATTAN_THRESHOLD) continue;

        const g0 = State.groups0 ? State.groups0[i] : null;
        const g1 = State.groups1 ? State.groups1[j] : null;
        if (!canBreed(g0, g1)) continue;

        const x1 = (State.type0[i][0] + 1) * 50;
        const y1 = -(State.type0[i][1] + 1) * 50;
        const x2 = (State.type1[j][0] + 1) * 50;
        const y2 = -(State.type1[j][1] + 1) * 50;
        allowed.add(`${x1},${y1}|${x2},${y2}`);
      }
    }

    svg.querySelectorAll('line[stroke="#48bb78"]').forEach((line) => {
      const key = `${line.getAttribute("x1")},${line.getAttribute("y1")}|${line.getAttribute("x2")},${line.getAttribute("y2")}`;
      if (!allowed.has(key)) {
        line.remove();
      }
    });
  }

  function syncVisualizationDecorations() {
    if (isSyncingViz) return;
    isSyncingViz = true;
    try {
      filterVisualizationLines();
      annotateVisualizationNotes();
    } finally {
      isSyncingViz = false;
    }
  }

  function annotateVisualizationNotes() {
    if (isAnnotating) return;
    isAnnotating = true;
    try {
      const groups = document.querySelectorAll("#viz-container .selectable-square");
      groups.forEach((groupEl) => {
        groupEl.querySelectorAll(".custom-note-badge").forEach(el => el.remove());

        const type = parseInt(groupEl.getAttribute("data-type") || "0", 10);
        const index = parseInt(groupEl.getAttribute("data-index") || "0", 10);

        const remark = type === 0
          ? (State.remarks0 && State.remarks0[index] ? State.remarks0[index] : "")
          : (State.remarks1 && State.remarks1[index] ? State.remarks1[index] : "");
        const eggLabel = getEggBadge(type, index);
        if (!remark && !eggLabel) return;

        const rect = groupEl.querySelector("rect");
        if (!rect) return;
        const x = parseFloat(rect.getAttribute("x") || "0");
        const y = parseFloat(rect.getAttribute("y") || "0");
        const width = parseFloat(rect.getAttribute("width") || "0");
        const height = parseFloat(rect.getAttribute("height") || "0");

        appendSvgBadge(groupEl, x, y, width, height, remark, "left");
        appendSvgBadge(groupEl, x, y, width, height, eggLabel, "right");
      });
    } finally {
      isAnnotating = false;
    }
  }

  function isCustomBadgeNode(node) {
    return node &&
      node.nodeType === Node.ELEMENT_NODE &&
      node.classList &&
      node.classList.contains("custom-note-badge");
  }

  function needsReannotate(mutations) {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") continue;

      const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
      for (const node of nodes) {
        if (!isCustomBadgeNode(node)) {
          return true;
        }
      }
    }
    return false;
  }

  function installVizObserver() {
    const container = document.getElementById("viz-container");
    if (!container || vizObserver) return;

    vizObserver = new MutationObserver((mutations) => {
      if (isSyncingViz || isAnnotating) return;
      if (!needsReannotate(mutations)) return;
      syncVisualizationDecorations();
    });

    vizObserver.observe(container, {
      subtree: true,
      childList: true
    });
  }

  function applyDebugPreset(type, preset) {
    const cfg = getSpriteTypeConfig(type);
    if (!Array.isArray(preset) || preset.length === 0) return;

    cfg.list.length = 0;
    preset.forEach(item => {
      const eggGroups = normalizeEggGroups(item.eggGroups);
      if (eggGroups.length === 0) return;

      cfg.list.push(createSprite(type, {
        gender: normalizeGender(item.gender),
        eggGroups,
        remark: normalizeRemark(item.remark),
        ...(type === "optional" ? { reusable: normalizeOptionalReuseCount(item.reusable) } : {})
      }));
    });
  }

  function applyDebugPresets() {
    applyDebugPreset("mandatory", DEBUG_MANDATORY_PRESET);
    applyDebugPreset("optional", DEBUG_OPTIONAL_PRESET);

    const onlyFromOptionalEl = document.getElementById("chk-only-optional");
    if (onlyFromOptionalEl && DEBUG_ONLY_FROM_OPTIONAL === true && OptionalSprites.length > 0) {
      onlyFromOptionalEl.checked = true;
    }
  }

  renderVisualization = function() {
    _renderVisualization();
    syncVisualizationDecorations();
  };

  updateStats = function(result) {
    if (State.k && State.m && MandatorySprites.length > 0) {
      const theoretical = State.k * State.m - countIncompatibleMandatory(MandatorySprites);
      _updateStats({ ...result, theoretical });
      return;
    }
    _updateStats(result);
  };

  solve = async function(n, k, updateProgress) {
    const m = n - k;
    const mandatorySprites = MandatorySprites;
    const incompatible = countIncompatibleMandatory(mandatorySprites);
    const theoreticalMax = k * m - incompatible;
    const boundary = Math.max(BOUNDARY_BASE, Math.ceil(n * BOUNDARY_SCALE));

    const mandFemales = mandatorySprites.filter(s => s.gender === 0);
    const mandMales = mandatorySprites.filter(s => s.gender === 1);
    const kMand = mandFemales.length;
    const mMand = mandMales.length;

    if (k < kMand || m < mMand) {
      throw new Error(`必选精灵数量超过当前雌雄设置（必选♀${kMand}/♂${mMand}，当前♀${k}/♂${m}）`);
    }

    const groups0 = mandFemales.map(s => s.eggGroups);
    const onlyFromOptionalEl = document.getElementById("chk-only-optional");
    const onlyFromOptional = !!(onlyFromOptionalEl && onlyFromOptionalEl.checked);
    const femaleNeed = k - kMand;
    const maleNeed = m - mMand;

    const optionalFemaleSelection = getOptionalSelection(0, femaleNeed, onlyFromOptional);
    if (!optionalFemaleSelection.ok) {
      throw new Error(`仅从可选精灵选择已启用：雌性可选精灵不足，还缺少 ${optionalFemaleSelection.missing} 个。`);
    }

    const optionalMaleSelection = getOptionalSelection(1, maleNeed, onlyFromOptional);
    if (!optionalMaleSelection.ok) {
      throw new Error(`仅从可选精灵选择已启用：雄性可选精灵不足，还缺少 ${optionalMaleSelection.missing} 个。`);
    }

    groups0.push(...optionalFemaleSelection.selected.map(s => (s ? s.eggGroups : null)));
    const groups1 = mandMales.map(s => s.eggGroups).concat(optionalMaleSelection.selected.map(s => (s ? s.eggGroups : null)));
    const remarks0 = mandFemales.map(s => (s.remark || "").trim()).concat(optionalFemaleSelection.selected.map(s => (s ? (s.remark || "").trim() : "")));
    const remarks1 = mandMales.map(s => (s.remark || "").trim()).concat(optionalMaleSelection.selected.map(s => (s ? (s.remark || "").trim() : "")));
    window.__solveContext = { groups0, groups1, kMand, mMand };

    try {
      updateProgress(5, `初始化 ${n} 个小窝, 雌性=${k}, 雄性=${m}, 边界=${boundary}...`);

      const numAttempts = n <= 10 ? SOLVER_ATTEMPTS_BASE : SOLVER_ATTEMPTS_LARGE;
      let bestType0 = null;
      let bestType1 = null;
      let bestScore = 0;

      const solver = new Solver(n, k, boundary);

      for (let attempt = 0; attempt < numAttempts; attempt++) {
        const progress = 5 + Math.floor((attempt / numAttempts) * 90);
        updateProgress(progress, `尝试 ${attempt + 1}/${numAttempts} | 当前最优: ${bestScore}/${theoreticalMax}...`);

        const result = solver.tryDifferentPatterns();
        if (!result) continue;

        const saResult = saOptimize(
          result.type0,
          result.type1,
          k,
          boundary,
          SA_INITIAL_TEMP,
          SA_COOLING_RATE,
          SA_MIN_TEMP,
          SA_MAX_ITERATIONS
        );

        const optResult = localOptimize(
          saResult.type0,
          saResult.type1,
          k,
          boundary,
          LOCAL_MAX_ITERATIONS
        );

        if (optResult.edges > bestScore) {
          bestScore = optResult.edges;
          bestType0 = optResult.type0.map(p => [...p]);
          bestType1 = optResult.type1.map(p => [...p]);

          if (bestScore >= theoreticalMax) {
            updateProgress(100, `✓ 达到理论最优 ${theoreticalMax}，提前停止`);
            break;
          }
        }

        await new Promise(r => setTimeout(r, 1));
      }

      const normalized = normalizeCoordinates(bestType0, bestType1);
      const reachRate = ((bestScore / theoreticalMax) * 100).toFixed(1);
      updateProgress(100, `计算完成! 配对数: ${bestScore}/${theoreticalMax} (${reachRate}%)`);

      return {
        n,
        k,
        m,
        type0: normalized.type0,
        type1: normalized.type1,
        edges: bestScore,
        theoretical: theoreticalMax,
        groups0,
        groups1,
        remarks0,
        remarks1,
        kMand,
        mMand
      };
    } finally {
      window.__solveContext = null;
    }
  };

  startSolving = async function() {
    if (State.solving) return;

    const setup = getSolveSetup();
    const error = validateSolveSetup(setup);
    if (error) {
      alert(error);
      return;
    }

    State.solving = true;
    document.getElementById("btn-solve").disabled = true;
    showProgress(true);

    try {
      const result = await solve(setup.n, setup.k, updateProgress);
      Object.assign(State, {
        n: result.n,
        k: result.k,
        m: result.m,
        type0: result.type0,
        type1: result.type1,
        groups0: result.groups0,
        groups1: result.groups1,
        remarks0: result.remarks0,
        remarks1: result.remarks1,
        kMand: result.kMand,
        mMand: result.mMand
      });
      State.originalType0 = result.type0.map(point => [...point]);
      State.originalType1 = result.type1.map(point => [...point]);

      updateStats(result);
      renderVisualization();
      updateConnectionsList();
      ["stats-panel", "viz-panel", "connections-panel"].forEach(id => {
        document.getElementById(id).classList.add("visible");
      });
    } catch (err) {
      console.error(err);
      alert("计算出错: " + err.message);
    } finally {
      State.solving = false;
      document.getElementById("btn-solve").disabled = false;
      setTimeout(() => showProgress(false), 500);
    }
  };

  updateConnectionsList = function() {
    const container = document.getElementById("connections-list");
    const allConns = getConnections(State.type0, State.type1);
    const connections = allConns.filter(conn => {
      const g0 = State.groups0 ? State.groups0[conn.type0Index] : null;
      const g1 = State.groups1 ? State.groups1[conn.type1Index] : null;
      return canBreed(g0, g1);
    });

    container.innerHTML = connections.map(conn => {
      const g0 = State.groups0 ? State.groups0[conn.type0Index] : null;
      const g1 = State.groups1 ? State.groups1[conn.type1Index] : null;
      const need0 = getNeedTag(0, conn.type0Index);
      const need1 = getNeedTag(1, conn.type1Index);
      const f0Tag = g0 ? `(${g0[0]})` : (need0 ? `(${need0})` : "可");
      const f1Tag = g1 ? `(${g1[0]})` : (need1 ? `(${need1})` : "可");
      return `<div class="connection-item"><span><span class="type0">♀${f0Tag}-${conn.type0Index + 1}</span> ↔ <span class="type1">♂${f1Tag}-${conn.type1Index + 1}</span></span><span class="dist">d=${conn.distance}</span></div>`;
    }).join("");
  };

  resetSolution = function() {
    if (State.originalType0.length === 0) return;
    State.type0 = State.originalType0.map(p => [...p]);
    State.type1 = State.originalType1.map(p => [...p]);
    State.selected.type = null;
    State.selected.index = null;
    updateStats({
      n: State.n,
      k: State.k,
      m: State.m,
      edges: countEdgesWithGroups(State.type0, State.type1, State.groups0, State.groups1),
      theoretical: State.k * State.m - countIncompatibleMandatory(MandatorySprites)
    });
    renderVisualization();
    updateConnectionsList();
  };

  updateType1Count = function() {
    const n = parseInt(document.getElementById("input-n").value) || 0;
    const k = parseInt(document.getElementById("input-k").value) || 0;
    document.getElementById("input-m").value = Math.max(0, n - k);
  };

  function initPatchedState() {
    ["groups0", "groups1", "remarks0", "remarks1"].forEach(key => {
      State[key] = State[key] || [];
    });
    State.kMand = State.kMand || 0;
    State.mMand = State.mMand || 0;
  }

  function syncPatchedInputs() {
    updateType1Count();
    updateOptionalInfo();
  }

  function initPatchedUI() {
    initPatchedState();
    ensureMandatorySection();
    applyDebugPresets();
    ["mandatory", "optional"].forEach(renderSpriteList);
    installVizObserver();

    const hintNodes = document.querySelectorAll(".input-group .input-hint");
    if (hintNodes[2]) hintNodes[2].textContent = "自动=总数-雌性";

    ["input-k", "input-n"].forEach(id => {
      const input = document.getElementById(id);
      if (input) input.addEventListener("input", syncPatchedInputs);
    });

    syncPatchedInputs();
  }

  document.addEventListener("DOMContentLoaded", initPatchedUI);

  document.addEventListener("click", e => {
    if (!e.target.closest(".egg-group-wrapper")) {
      closeEggGroupDropdowns();
    }
  });
})();
