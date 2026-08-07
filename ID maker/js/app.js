/**
 * app.js — Main Application (Sketch Revision)
 * State: palette, mood, portrait, logo, textFields (event/team/member/role),
 *        borderColor, roleColor, shapes.
 */

import { idCardTemplate, getSoftExclusionZone } from './template.js';
import { palettePresets, getDefaultPalette, getContrastRatio } from './palette.js';
import { moodPresets, generateShapes } from './moods.js';
import { renderCard } from './renderer.js';
import { exportJPG, exportPDF } from './export.js';

/* ── State ──────────────────────────────────────────────────── */

/* ── State ──────────────────────────────────────────────────── */

const state = {
  palette: getDefaultPalette(),
  mood: 'corporate',
  portraitImage: null,
  cardSide: 'front', // 'front' or 'back'
  roleMode: 'single', // 'single' or 'skills'
  skillsList: ['React', 'Node.js', 'UI/UX', 'Python', 'Docker'],
  socialPlatform: 'instagram',
  socialHandle: 'hacker_house_goa',
  textFields: {
    eventName: 'HACKER HOUSE GOA',
    teamName: 'Team Alpha',
    memberName: 'John Doe',
    role: 'Developer | UI/UX'
  },
  borderColor: '#0077B6',
  roleColor: '#E63946',
  useChromeEffect: false,
  lightPos: { x: 0.5, y: 0.3 },
  shapeSeed: Date.now(),
  shapes: [],
  template: idCardTemplate
};

let canvas, ctx;

/* ── Core ───────────────────────────────────────────────────── */

function regenerateShapes() {
  const exclusion = getSoftExclusionZone(state.template);
  const { widthPx: cw, heightPx: ch } = state.template.canvas;
  state.shapes = generateShapes(state.mood, state.palette, exclusion, cw, ch, state.shapeSeed);
}

function render() {
  if (!ctx) return;
  renderCard(ctx, state);
}

function update() {
  regenerateShapes();
  render();
}

function syncRoleTextFromSkills() {
  if (state.roleMode === 'skills') {
    const validSkills = state.skillsList.map(s => s.trim()).filter(Boolean);
    state.textFields.role = validSkills.join(' | ');
  }
}

/* ── UI Builders ────────────────────────────────────────────── */

function buildMoodCards() {
  const container = document.getElementById('moodGrid');
  if (!container) return;
  container.innerHTML = '';

  for (const [key, mood] of Object.entries(moodPresets)) {
    const card = document.createElement('button');
    card.className = `mood-card${key === state.mood ? ' active' : ''}`;
    card.dataset.mood = key;
    card.innerHTML = `
      <span class="mood-icon">${mood.icon}</span>
      <span class="mood-name">${mood.name}</span>
      <span class="mood-desc">${mood.description}</span>
    `;
    card.addEventListener('click', () => {
      state.mood = key;
      state.shapeSeed = Date.now();
      container.querySelectorAll('.mood-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      update();
    });
    container.appendChild(card);
  }
}

function buildPaletteSwatches() {
  const container = document.getElementById('paletteGrid');
  if (!container) return;
  container.innerHTML = '';

  palettePresets.forEach((preset, idx) => {
    const swatch = document.createElement('button');
    swatch.className = `palette-swatch${idx === 0 ? ' active' : ''}`;
    swatch.innerHTML = `
      <div class="swatch-colors">
        <span class="swatch-dot" style="background:${preset.colors.primary}"></span>
        <span class="swatch-dot" style="background:${preset.colors.secondary}"></span>
        <span class="swatch-dot" style="background:${preset.colors.surface}; border: 1px solid rgba(255,255,255,0.15)"></span>
        <span class="swatch-dot" style="background:${preset.colors.text}"></span>
        <span class="swatch-dot" style="background:${preset.colors.background}; border: 1px solid rgba(255,255,255,0.15)"></span>
      </div>
      <span class="swatch-name">${preset.name}</span>
    `;
    swatch.addEventListener('click', () => {
      state.palette = { ...preset.colors };
      container.querySelectorAll('.palette-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      updateCustomPickers();
      updateContrastBadge();
      update();
    });
    container.appendChild(swatch);
  });
}

function buildCustomPickers() {
  const container = document.getElementById('customPalette');
  if (!container) return;
  const roles = [
    { key: 'primary', label: 'Primary' },
    { key: 'secondary', label: 'Secondary' },
    { key: 'surface', label: 'Surface' },
    { key: 'text', label: 'Text' },
    { key: 'background', label: 'Background' }
  ];
  container.innerHTML = '';
  roles.forEach(({ key, label }) => {
    const group = document.createElement('div');
    group.className = 'color-picker-group';
    group.innerHTML = `
      <label for="color-${key}">${label}</label>
      <input type="color" id="color-${key}" value="${state.palette[key]}" />
    `;
    group.querySelector('input').addEventListener('input', (e) => {
      state.palette[key] = e.target.value;
      document.querySelectorAll('.palette-swatch').forEach(s => s.classList.remove('active'));
      updateContrastBadge();
      update();
    });
    container.appendChild(group);
  });
}

function updateCustomPickers() {
  for (const key of ['primary', 'secondary', 'surface', 'text', 'background']) {
    const input = document.getElementById(`color-${key}`);
    if (input) input.value = state.palette[key];
  }
}

function updateContrastBadge() {
  const badge = document.getElementById('contrastBadge');
  if (!badge) return;
  const ratio = getContrastRatio(state.palette.text, state.palette.background);
  const passes = ratio >= 4.5;
  badge.className = `contrast-badge ${passes ? 'pass' : 'fail'}`;
  badge.innerHTML = `
    <span class="contrast-icon">${passes ? '✓' : '⚠'}</span>
    <span class="contrast-text">Contrast: ${ratio.toFixed(1)}:1 ${passes ? '(WCAG AA ✓)' : '(Below 4.5:1)'}</span>
  `;
}

/* ── Image Loading ──────────────────────────────────────────── */

function loadImageFile(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => callback(img, e.target.result);
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function wireUploadZone(zoneId, inputId, onLoad, previewClass) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  if (!zone || !input) return;

  zone.addEventListener('click', (e) => {
    if (e.target !== input) input.click();
  });
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      loadImageFile(file, (img, dataUrl) => {
        onLoad(img);
        showPreview(zone, dataUrl, previewClass);
      });
    }
  });
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      loadImageFile(file, (img, dataUrl) => {
        onLoad(img);
        showPreview(zone, dataUrl, previewClass);
      });
    }
  });
}

function showPreview(zone, dataUrl, previewClass) {
  zone.classList.add('has-image');
  let preview = zone.querySelector(`.${previewClass}`);
  if (preview) {
    preview.src = dataUrl;
  } else {
    preview = document.createElement('img');
    preview.className = previewClass;
    preview.src = dataUrl;
    preview.alt = 'Uploaded image';
    zone.appendChild(preview);
  }
}

/* ── Event Wiring ───────────────────────────────────────────── */

function wireTextInputs() {
  const fields = [
    { id: 'eventNameInput', key: 'eventName' },
    { id: 'teamNameInput', key: 'teamName' },
    { id: 'memberNameInput', key: 'memberName' },
    { id: 'roleInput', key: 'role' }
  ];
  fields.forEach(({ id, key }) => {
    const input = document.getElementById(id);
    if (input) {
      input.value = state.textFields[key];
      input.addEventListener('input', (e) => {
        state.textFields[key] = e.target.value;
        render();
      });
    }
  });

  // Single Role vs Up to 5 Skills Mode Wiring
  const singleBtn = document.getElementById('modeSingleRole');
  const multiBtn = document.getElementById('modeMultiSkills');
  const singleGroup = document.getElementById('singleRoleGroup');
  const multiGroup = document.getElementById('multiSkillsGroup');

  if (singleBtn && multiBtn) {
    singleBtn.addEventListener('click', () => {
      state.roleMode = 'single';
      singleBtn.classList.add('active');
      multiBtn.classList.remove('active');
      singleGroup.classList.remove('hidden');
      multiGroup.classList.add('hidden');
      const roleIn = document.getElementById('roleInput');
      if (roleIn) state.textFields.role = roleIn.value || 'Developer';
      render();
    });

    multiBtn.addEventListener('click', () => {
      state.roleMode = 'skills';
      multiBtn.classList.add('active');
      singleBtn.classList.remove('active');
      multiGroup.classList.remove('hidden');
      singleGroup.classList.add('hidden');
      syncRoleTextFromSkills();
      render();
    });
  }

  // 5 Skill Inputs Wiring
  for (let i = 1; i <= 5; i++) {
    const skillInput = document.getElementById(`skillInput${i}`);
    if (skillInput) {
      skillInput.value = state.skillsList[i - 1] || '';
      skillInput.addEventListener('input', (e) => {
        state.skillsList[i - 1] = e.target.value;
        if (state.roleMode === 'skills') {
          syncRoleTextFromSkills();
          render();
        }
      });
    }
  }

  // Social Media Scanner Wiring
  const platformSelect = document.getElementById('socialPlatformSelect');
  const handleInput = document.getElementById('socialHandleInput');
  const handleLabel = document.getElementById('socialHandleLabel');

  if (platformSelect) {
    platformSelect.value = state.socialPlatform;
    platformSelect.addEventListener('change', (e) => {
      state.socialPlatform = e.target.value;
      if (handleLabel) {
        if (state.socialPlatform === 'instagram') handleLabel.textContent = 'Instagram Handle';
        else if (state.socialPlatform === 'x') handleLabel.textContent = '𝕏 / Twitter Handle';
        else if (state.socialPlatform === 'discord') handleLabel.textContent = 'Discord Invite / Handle';
        else handleLabel.textContent = 'Custom Link / URL';
      }
      render();
    });
  }

  if (handleInput) {
    handleInput.value = state.socialHandle;
    handleInput.addEventListener('input', (e) => {
      state.socialHandle = e.target.value;
      render();
    });
  }
}

function wireColorPickers() {
  const borderPicker = document.getElementById('borderColorPicker');
  if (borderPicker) {
    borderPicker.value = state.borderColor;
    borderPicker.addEventListener('input', (e) => {
      state.borderColor = e.target.value;
      render();
    });
  }

  const rolePicker = document.getElementById('roleColorPicker');
  if (rolePicker) {
    rolePicker.value = state.roleColor;
    rolePicker.addEventListener('input', (e) => {
      state.roleColor = e.target.value;
      render();
    });
  }

  const chromeToggle = document.getElementById('chromeToggle');
  if (chromeToggle) {
    chromeToggle.checked = state.useChromeEffect;
    chromeToggle.addEventListener('change', (e) => {
      state.useChromeEffect = e.target.checked;
      render();
    });
  }
}

function wireButtons() {
  const regenerateBtn = document.getElementById('regenerateBtn');
  if (regenerateBtn) {
    regenerateBtn.addEventListener('click', () => {
      state.shapeSeed = Date.now();
      regenerateBtn.classList.add('spin');
      setTimeout(() => regenerateBtn.classList.remove('spin'), 400);
      update();
    });
  }

  // Flip Card Button Wiring
  const flipBtn = document.getElementById('flipCardBtn');
  const flipSideText = document.getElementById('flipSideText');
  const canvasWrapper = document.getElementById('canvasWrapper');

  if (flipBtn) {
    flipBtn.addEventListener('click', () => {
      state.cardSide = state.cardSide === 'front' ? 'back' : 'front';
      if (flipSideText) {
        flipSideText.textContent = state.cardSide.toUpperCase();
      }
      if (canvasWrapper) {
        canvasWrapper.classList.add('flipping');
        setTimeout(() => canvasWrapper.classList.remove('flipping'), 500);
      }
      render();
    });
  }

  // Export JPEG & Complete PDF Wiring
  document.getElementById('exportJpg1x')?.addEventListener('click', () => exportJPG(state, 1));
  document.getElementById('exportJpg2x')?.addEventListener('click', () => exportJPG(state, 2));
  document.getElementById('exportPdfBtn')?.addEventListener('click', () => exportPDF(state));
}

/* ── Canvas Scaling ─────────────────────────────────────────── */

function resizeCanvasDisplay() {
  const wrapper = document.querySelector('.canvas-wrapper');
  if (!wrapper || !canvas) return;
  const wrapperW = wrapper.clientWidth;
  const wrapperH = wrapper.clientHeight;
  const canvasAspect = state.template.canvas.widthPx / state.template.canvas.heightPx;
  const wrapperAspect = wrapperW / wrapperH;
  let displayW, displayH;
  if (wrapperAspect > canvasAspect) {
    displayH = wrapperH * 0.92;
    displayW = displayH * canvasAspect;
  } else {
    displayW = wrapperW * 0.92;
    displayH = displayW / canvasAspect;
  }
  canvas.style.width = `${displayW}px`;
  canvas.style.height = `${displayH}px`;
}

/* ── Mouse 3D Tilt & Light Tracking ───────────────────────── */

function wireMouse3DTilt() {
  const wrapper = document.querySelector('.canvas-wrapper');
  if (!wrapper || !canvas) return;

  wrapper.addEventListener('mousemove', (e) => {
    const rect = wrapper.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    state.lightPos = {
      x: Math.max(0, Math.min(1, x / rect.width)),
      y: Math.max(0, Math.min(1, y / rect.height))
    };

    const normX = (x / rect.width) - 0.5;
    const normY = (y / rect.height) - 0.5;

    const tiltX = normY * -16;
    const tiltY = normX * 16;

    canvas.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.02, 1.02, 1.02)`;

    if (state.useChromeEffect) {
      render();
    }
  });

  wrapper.addEventListener('mouseleave', () => {
    canvas.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    state.lightPos = { x: 0.5, y: 0.3 };
    if (state.useChromeEffect) {
      render();
    }
  });
}

/* ── Init ───────────────────────────────────────────────────── */

function init() {
  canvas = document.getElementById('cardCanvas');
  if (!canvas) return;
  canvas.width = state.template.canvas.widthPx;
  canvas.height = state.template.canvas.heightPx;
  ctx = canvas.getContext('2d');

  buildMoodCards();
  buildPaletteSwatches();
  buildCustomPickers();
  updateContrastBadge();

  wireUploadZone('uploadZone', 'photoInput', (img) => {
    state.portraitImage = img;
    render();
  }, 'upload-preview');

  wireTextInputs();
  wireColorPickers();
  wireButtons();

  // Click on canvas portrait area to upload (Front side only)
  canvas.addEventListener('click', (e) => {
    if (state.cardSide === 'back' || state.portraitImage) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = state.template.canvas.widthPx / rect.width;
    const scaleY = state.template.canvas.heightPx / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;
    const p = state.template.portrait;
    const pr = {
      x: (p.xPct / 100) * state.template.canvas.widthPx,
      y: (p.yPct / 100) * state.template.canvas.heightPx,
      w: (p.widthPct / 100) * state.template.canvas.widthPx,
      h: (p.heightPct / 100) * state.template.canvas.heightPx
    };
    if (cx >= pr.x && cx <= pr.x + pr.w && cy >= pr.y && cy <= pr.y + pr.h) {
      document.getElementById('photoInput')?.click();
    }
  });

  resizeCanvasDisplay();
  wireMouse3DTilt();
  window.addEventListener('resize', resizeCanvasDisplay);

  update();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
