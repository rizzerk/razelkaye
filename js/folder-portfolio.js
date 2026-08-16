(() => {
  // Config, matching the design canvas defaults (spread: stacked, tilt: 1, openOnLoad: false).
  const SPREAD = 'stacked';
  const TILT = 1;
  const OPEN_ON_LOAD = false;
  const N = 5;

  class FolderPortfolio {
    els = {};
    pos = {};
    topZ = 200;
    coverZ = 900;
    FX = 0; FY = 0; W = 0; H = 0;
    scale = 1;
    open = false;
    drag = null;
    cdrag = null;
    dragUp = null;

    init() {
      this.els.outer = document.getElementById('outer');
      this.els.scene = document.getElementById('scene');
      this.els.folder = document.getElementById('folder');
      this.els.cover = document.getElementById('cover');
      this.els.tab = document.getElementById('tab');
      for (let i = 0; i < N; i++) {
        this.els[i] = document.querySelector('.sheet[data-index="' + i + '"]');
      }

      this.els.tab.addEventListener('click', this.tabClick);
      this.els.cover.addEventListener('pointerdown', this.coverDown);
      for (let i = 0; i < N; i++) {
        this.els[i].addEventListener('pointerdown', (e) => this.onDown(i, e));
      }

      this.layout(OPEN_ON_LOAD);
      if (OPEN_ON_LOAD) { this.open = true; this.coverZ = 2; }
      this.syncCover();
      this.fit();
      requestAnimationFrame(this.fit);
      setTimeout(this.fit, 120);
      window.addEventListener('pointermove', this.onMove);
      window.addEventListener('pointerup', this.onUp);
      window.addEventListener('resize', this.fit);
    }

    fit = () => {
      const outer = this.els.outer, scene = this.els.scene, folder = this.els.folder;
      if (!outer || !scene || !folder) return;
      const vw = outer.clientWidth, vh = outer.clientHeight;
      const s = Math.max(0.5, Math.min(2.6, (vh - 74) / 606, (vw - 80) / 460));
      this.scale = s;
      this.W = Math.round(vw * 2.2);
      this.H = Math.round(vh * 2.2);
      this.FX = Math.round(this.W / 2 - 220 * s);
      this.FY = Math.round(this.H / 2 - 290 * s);
      scene.style.width = this.W + 'px';
      scene.style.height = this.H + 'px';
      this.placeFolder();
      outer.scrollLeft = (this.W - vw) / 2;
      outer.scrollTop = (this.H - vh) / 2;
    };

    placeFolder() {
      const f = this.els.folder;
      if (!f) return;
      f.style.transformOrigin = '0 0';
      f.style.transform = 'translate(' + this.FX + 'px,' + this.FY + 'px) scale(' + this.scale + ')';
    }

    grow() {
      const outer = this.els.outer, scene = this.els.scene;
      if (!outer || !scene) return;
      const s = this.scale, pad = 140;
      let dx = 0, dy = 0, W = this.W, H = this.H;
      for (let i = 0; i < N; i++) {
        const p = this.pos[i];
        if (!p) continue;
        const x = this.FX + p.x * s, y = this.FY + p.y * s;
        if (x - pad < 0) dx = Math.max(dx, pad - x);
        if (y - pad < 0) dy = Math.max(dy, pad - y);
        W = Math.max(W, x + 400 * s + pad);
        H = Math.max(H, y + 540 * s + pad);
      }
      if (dx || dy) { this.FX += dx; this.FY += dy; W += dx; H += dy; }
      W = Math.round(W); H = Math.round(H);
      if (W !== this.W || H !== this.H || dx || dy) {
        this.W = W; this.H = H;
        scene.style.width = W + 'px';
        scene.style.height = H + 'px';
        this.placeFolder();
        if (dx) outer.scrollLeft += dx;
        if (dy) outer.scrollTop += dy;
      }
    }

    homeFor(i, open) {
      const t = TILT;
      if (!open) return { x: 22 + i * 7, y: 15 - i * 3, r: (-1.2 + i * 0.9) * t, z: 20 - i };
      const spread = SPREAD;
      if (spread === 'fan') {
        const a = -20 + i * 8;
        return { x: 520 + i * 40, y: 40 + Math.abs(i - 2.5) * 24, r: a * t, z: 100 - i };
      }
      if (spread === 'cascade') return { x: 500 + i * 62, y: 8 + i * 30, r: (-5 + i * 2.6) * t, z: 100 - i };
      return { x: 22 + i * 7, y: 15 - i * 3, r: (-1.2 + i * 0.9) * t, z: 100 - i };
    }

    layout(open) {
      for (let i = 0; i < N; i++) { this.pos[i] = this.homeFor(i, open); this.apply(i, true); }
      this.topZ = open ? 200 : 60;
    }

    apply(i, animate) {
      const el = this.els[i], p = this.pos[i];
      if (!el || !p) return;
      el.style.transition = animate ? 'transform .62s cubic-bezier(.22,.9,.24,1)' : 'none';
      el.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px) rotate(' + p.r + 'deg)';
      el.style.zIndex = p.z;
    }

    syncCover(ms) {
      const el = this.els.cover;
      if (!el) return;
      const open = this.open;
      el.style.transition = 'transform ' + (ms == null ? 950 : ms) + 'ms cubic-bezier(.3,.85,.2,1)';
      el.style.transform = 'rotateY(' + (open ? -166 : 0) + 'deg)';
      el.style.zIndex = this.coverZ == null ? 900 : this.coverZ;
    }

    setOpen(open, delay) {
      this.open = open;
      // Kick off the cover's rotation immediately (mirrors the original
      // React version's componentDidUpdate firing syncCover() right after
      // setState). coverZ stays unchanged here, so the cover keeps
      // covering the sheets while it rotates; only after the delayed
      // z-index swap below do the sheets become visible in front of it.
      this.syncCover();
      clearTimeout(this._zt);
      const stacked = SPREAD === 'stacked';
      if (open) {
        this._zt = setTimeout(() => {
          this.coverZ = 2;
          for (let i = 0; i < N; i++) { this.pos[i].z = 100 - i; this.apply(i, false); }
          this.topZ = 200;
          this.syncCover();
          if (!stacked) this.layout(true);
        }, delay == null ? 620 : delay);
      } else {
        this.coverZ = 900;
        this.layout(false);
        this.syncCover();
      }
    }

    toggle = () => this.setOpen(!this.open);
    tabClick = () => this.setOpen(!this.open);
    tidy = () => this.layout(this.open);

    coverDown = (e) => {
      if (e.target && e.target.closest && e.target.closest('a')) return;
      e.preventDefault();
      const el = this.els.cover;
      this.coverZ = 900;
      if (el) { el.style.zIndex = 900; el.style.transition = 'none'; el.style.cursor = 'grabbing'; }
      this.cdrag = { sx: e.clientX, a: this.open ? -166 : 0, start: this.open ? -166 : 0, moved: 0 };
    };

    onDown(i, e) {
      if (!this.open) { this.setOpen(true); return; }
      if (e.target && e.target.closest && e.target.closest('a')) return;
      e.preventDefault();
      const p = this.pos[i];
      this.drag = { i: i, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y };
      p.z = ++this.topZ;
      const el = this.els[i];
      if (el) { el.style.cursor = 'grabbing'; el.style.boxShadow = '0 2px 6px rgba(40,30,20,.18),0 34px 60px rgba(40,30,20,.26)'; }
      this.apply(i, false);
    }

    onMove = (e) => {
      const c = this.cdrag;
      if (c) {
        const s2 = this.scale || 1;
        const dx = e.clientX - c.sx;
        c.moved = Math.max(c.moved, Math.abs(dx));
        c.a = Math.max(-166, Math.min(0, c.start + (dx / (440 * s2)) * 166));
        const el = this.els.cover;
        if (el) el.style.transform = 'rotateY(' + c.a + 'deg)';
        return;
      }
      const d = this.drag;
      if (!d) return;
      const p = this.pos[d.i];
      const k = this.scale || 1;
      p.x = d.ox + (e.clientX - d.sx) / k;
      p.y = d.oy + (e.clientY - d.sy) / k;
      this.apply(d.i, false);
      this.grow();
    };

    onUp = () => {
      const c = this.cdrag;
      if (c) {
        this.cdrag = null;
        const el = this.els.cover;
        if (el) el.style.cursor = 'grab';
        if (c.moved < 6) this.setOpen(!this.open);
        else this.setOpen(c.a < -83, 320);
        return;
      }
      const d = this.drag;
      if (!d) return;
      const el = this.els[d.i];
      if (el) { el.style.cursor = 'grab'; el.style.boxShadow = '0 1px 2px rgba(40,30,20,.14),0 14px 34px rgba(40,30,20,.16)'; }
      this.drag = null;
    };
  }

  const app = new FolderPortfolio();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
  } else {
    app.init();
  }
})();
