"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  createProject,
  editProject,
  login,
  logout,
  removeProject,
  reorderProjects,
  saveBio,
} from "@/app/actions";
import type { Category, PortfolioData, Project } from "@/lib/types";

type SectionDef = {
  cat: Category;
  id: string;
  label: string;
  title: string;
  nav: string;
};

const SECTIONS: SectionDef[] = [
  { cat: "web", id: "web-apps", label: "01", title: "Web App Projects", nav: "Web Apps" },
  { cat: "wp", id: "wordpress", label: "02", title: "WordPress Projects", nav: "WordPress" },
  { cat: "ui", id: "ui-ux", label: "03", title: "UI / UX Design Projects", nav: "UI / UX" },
];

const ADD_TITLES: Record<Category, string> = {
  web: "Add Web App Project",
  wp: "Add WordPress Project",
  ui: "Add UI / UX Project",
};
const EDIT_TITLES: Record<Category, string> = {
  web: "Edit Web App Project",
  wp: "Edit WordPress Project",
  ui: "Edit UI / UX Project",
};

function thumbUrl(url: string): string {
  return "/api/thumb?url=" + encodeURIComponent(url);
}
function cleanUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}
function safeHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : "#";
}
function countLabel(n: number): string {
  return n === 0 ? "" : n === 1 ? "1 project" : `${n} projects`;
}

export default function Portfolio({
  initialData,
  initialAuthed,
}: {
  initialData: PortfolioData;
  initialAuthed: boolean;
}) {
  const [data, setData] = useState<PortfolioData>(initialData);
  const [editMode, setEditMode] = useState(false);
  const [themeIcon, setThemeIcon] = useState("☀");

  // modals: which overlay is open
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);

  // project form
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", url: "", desc: "" });
  const [invalid, setInvalid] = useState({ name: false, url: false });
  const [saving, setSaving] = useState(false);

  // pin
  const [pinBuffer, setPinBuffer] = useState("");
  const [pinError, setPinError] = useState("");

  // misc UI
  const [copyHint, setCopyHint] = useState("Click to copy");
  const [footerName, setFooterName] = useState("Jack K. Osei");
  const [stickyVisible, setStickyVisible] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // drag state
  const dragRef = useRef<{ id: number; cat: Category } | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  /* ── EDIT MODE ── */
  const activateEditMode = useCallback(() => setEditMode(true), []);
  const deactivateEditMode = useCallback(async () => {
    setEditMode(false);
    try {
      await logout();
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.body.classList.toggle("edit-mode", editMode);
    return () => document.body.classList.remove("edit-mode");
  }, [editMode]);

  /* ── THEME ── */
  useEffect(() => {
    const current =
      document.documentElement.getAttribute("data-theme") || "dark";
    setThemeIcon(current === "light" ? "☾" : "☀");
  }, []);

  const toggleTheme = useCallback(() => {
    const html = document.documentElement;
    const isDark = html.getAttribute("data-theme") === "dark";
    const next = isDark ? "light" : "dark";
    html.setAttribute("data-theme", next);
    setThemeIcon(next === "light" ? "☾" : "☀");
    try {
      localStorage.setItem("portfolio_theme", next);
    } catch {
      /* ignore */
    }
  }, []);

  /* ── PIN ── */
  const closePinModal = useCallback(() => {
    setPinOpen(false);
    setPinBuffer("");
    setPinError("");
    const url = new URL(window.location.href);
    url.searchParams.delete("edit");
    window.history.replaceState({}, "", url);
  }, []);

  const checkPin = useCallback(
    async (pin: string) => {
      try {
        const { ok } = await login(pin);
        if (ok) {
          closePinModal();
          activateEditMode();
        } else {
          setPinError("Incorrect PIN");
          setPinBuffer("");
          setTimeout(() => setPinError(""), 1500);
        }
      } catch (err) {
        setPinError((err as Error).message || "Login failed");
        setPinBuffer("");
        setTimeout(() => setPinError(""), 2500);
      }
    },
    [activateEditMode, closePinModal],
  );

  const pinKey = useCallback(
    (k: string) => {
      setPinBuffer((prev) => {
        if (k === "back") return prev.slice(0, -1);
        if (prev.length >= 6) return prev;
        const next = prev + k;
        if (next.length === 6) setTimeout(() => checkPin(next), 120);
        return next;
      });
    },
    [checkPin],
  );

  /* ── ?edit FLAG ── */
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("edit")) {
      if (initialAuthed) {
        activateEditMode();
      } else {
        setPinOpen(true);
      }
    }
  }, [initialAuthed, activateEditMode]);

  /* ── PROJECT MODAL ── */
  const openAddModal = useCallback((cat: Category) => {
    setActiveCategory(cat);
    setEditingId(null);
    setForm({ name: "", url: "", desc: "" });
    setInvalid({ name: false, url: false });
    setProjectModalOpen(true);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  }, []);

  const openEditModal = useCallback(
    (cat: Category, id: number) => {
      const project = data[cat].find((p) => p.id === id);
      if (!project) return;
      setActiveCategory(cat);
      setEditingId(id);
      setForm({ name: project.name, url: project.url, desc: project.desc });
      setInvalid({ name: false, url: false });
      setProjectModalOpen(true);
      setTimeout(() => nameInputRef.current?.focus(), 100);
    },
    [data],
  );

  const closeProjectModal = useCallback(() => {
    setProjectModalOpen(false);
    setActiveCategory(null);
    setEditingId(null);
  }, []);

  const saveProject = useCallback(async () => {
    const name = form.name.trim();
    const url = form.url.trim();
    const desc = form.desc.trim();
    setInvalid({ name: !name, url: !url });
    if (!name || !url) return;

    setSaving(true);
    try {
      if (editingId != null) {
        const updated = await editProject({ id: editingId, name, url, desc });
        setData((prev) => ({
          ...prev,
          [updated.category]: prev[updated.category].map((p) =>
            p.id === updated.id ? updated : p,
          ),
        }));
      } else if (activeCategory) {
        const cat = activeCategory;
        const created = await createProject({
          category: cat,
          name,
          url,
          desc,
          sortOrder: data[cat].length,
        });
        setData((prev) => ({ ...prev, [cat]: [...prev[cat], created] }));
      }
      closeProjectModal();
    } catch (err) {
      alert("Failed to save: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [activeCategory, closeProjectModal, data, editingId, form]);

  const deleteProject = useCallback(async (cat: Category, id: number) => {
    try {
      await removeProject(id);
      setData((prev) => ({
        ...prev,
        [cat]: prev[cat].filter((p) => p.id !== id),
      }));
    } catch (err) {
      alert("Failed to delete: " + (err as Error).message);
    }
  }, []);

  /* ── BIO + FOOTER NAME EDIT ── */
  const editBio = useCallback(async () => {
    if (!editMode) return;
    const next = prompt("Edit bio:", data.bio);
    if (next !== null && next.trim()) {
      const value = next.trim();
      try {
        await saveBio(value);
        setData((prev) => ({ ...prev, bio: value }));
      } catch (err) {
        alert("Failed to save bio: " + (err as Error).message);
      }
    }
  }, [data.bio, editMode]);

  const editFooterName = useCallback(() => {
    if (!editMode) return;
    const next = prompt("Edit displayed name:", footerName);
    if (next && next.trim()) setFooterName(next.trim());
  }, [editMode, footerName]);

  /* ── CONTACT ── */
  const copyEmail = useCallback(() => {
    navigator.clipboard.writeText("jackoseik@gmail.com").then(() => {
      setCopyHint("Copied!");
      setTimeout(() => setCopyHint("Click to copy"), 2000);
    });
  }, []);

  /* ── DRAG REORDER ── */
  const handleDrop = useCallback(
    (cat: Category, targetId: number, e: React.DragEvent) => {
      e.preventDefault();
      setDragOverId(null);
      const dragged = dragRef.current;
      if (!dragged || dragged.cat !== cat || dragged.id === targetId) return;

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const insertAfter =
        e.clientY > rect.bottom
          ? true
          : e.clientY < rect.top
            ? false
            : e.clientX > rect.left + rect.width / 2;

      const list = [...data[cat]];
      const from = list.findIndex((p) => p.id === dragged.id);
      let to = list.findIndex((p) => p.id === targetId);
      if (from === -1 || to === -1) return;
      if (insertAfter) to++;
      const [moved] = list.splice(from, 1);
      if (from < to) to--;
      list.splice(Math.max(0, to), 0, moved);
      const reordered = list.map((p, i) => ({ ...p, sort_order: i }));

      setData((prev) => ({ ...prev, [cat]: reordered }));
      reorderProjects(
        cat,
        reordered.map((p) => p.id),
      ).catch((err) => alert("Failed to save order: " + err.message));
    },
    [data],
  );

  /* ── KEYBOARD ── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (projectModalOpen) closeProjectModal();
        if (contactOpen) setContactOpen(false);
        if (pinOpen) closePinModal();
      }
      if (e.key === "Enter" && projectModalOpen) {
        const tag = (document.activeElement as HTMLElement)?.tagName;
        if (tag !== "TEXTAREA") saveProject();
      }
      if (pinOpen) {
        if (/^[0-9]$/.test(e.key)) pinKey(e.key);
        if (e.key === "Backspace") pinKey("back");
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [
    projectModalOpen,
    contactOpen,
    pinOpen,
    closeProjectModal,
    closePinModal,
    saveProject,
    pinKey,
  ]);

  /* ── STICKY NAV + SECTION HIGHLIGHT ── */
  useEffect(() => {
    const pills = document.querySelector(".nav-pills");
    const observers: IntersectionObserver[] = [];

    if (pills) {
      const navObs = new IntersectionObserver(([entry]) => {
        setStickyVisible(!entry.isIntersecting);
      });
      navObs.observe(pills);
      observers.push(navObs);
    }

    const sectionObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) sectionObs.observe(el);
    });
    observers.push(sectionObs);

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const navActive = (id: string) => (activeSection === id ? " active" : "");

  return (
    <>
      {/* Sticky section nav (appears on scroll) */}
      <nav className={"sticky-nav" + (stickyVisible ? " visible" : "")}>
        {SECTIONS.map(({ cat, id, nav }) => (
          <a key={id} href={"#" + id} className={cat + navActive(id)}>
            {nav}
          </a>
        ))}
      </nav>

      {/* Top bar: edit badge + exit */}
      <div className="topbar">
        <span className={"edit-badge" + (editMode ? " visible" : "")}>
          ✦ Edit Mode
        </span>
        <button className="exit-edit" onClick={deactivateEditMode}>
          Exit ✕
        </button>
      </div>

      <header>
        <nav className="main-nav">
          <p className="intro">{"// Hi, I'm Jack Osei"}</p>
          <div className="nav-buttons">
            <button
              className="btn btn-primary"
              onClick={() => setContactOpen(true)}
            >
              Hire me!
            </button>
            <button
              className="theme-toggle"
              title="Toggle light/dark"
              onClick={toggleTheme}
            >
              {themeIcon}
            </button>
          </div>
        </nav>
        <h1>
          Welcome to my <br />
          <em>Creative</em> Portfolio
        </h1>
        <p
          className="bio"
          title={editMode ? "Click to edit bio" : undefined}
          onClick={editBio}
        >
          {data.bio}
        </p>
        <nav className="nav-pills">
          {SECTIONS.map(({ cat, id, nav }) => (
            <a key={id} href={"#" + id} className={cat + navActive(id)}>
              {nav}
            </a>
          ))}
        </nav>
      </header>

      <main>
        {SECTIONS.map(({ cat, id, label, title }) => {
          const projects = data[cat];
          return (
            <section key={id} className={"section " + cat} id={id}>
              <div className="section-header">
                <span className="section-label">{label}</span>
                <h2 className="section-title">{title}</h2>
                <span className="section-count">
                  {countLabel(projects.length)}
                </span>
              </div>
              <div className="grid">
                {!editMode && projects.length === 0 && (
                  <p className="empty-state" style={{ display: "block" }}>
                    No projects yet.
                  </p>
                )}
                {projects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    cat={cat}
                    editMode={editMode}
                    dragging={draggingId === p.id}
                    dragOver={dragOverId === p.id}
                    onEdit={() => openEditModal(cat, p.id)}
                    onDelete={() => deleteProject(cat, p.id)}
                    onDragStart={() => {
                      dragRef.current = { id: p.id, cat };
                      setDraggingId(p.id);
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDragOverId(null);
                      dragRef.current = null;
                    }}
                    onDragOver={(e) => {
                      if (!dragRef.current || dragRef.current.cat !== cat) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragRef.current.id !== p.id) setDragOverId(p.id);
                    }}
                    onDragLeave={() => setDragOverId(null)}
                    onDrop={(e) => handleDrop(cat, p.id, e)}
                  />
                ))}
                <button className="add-card" onClick={() => openAddModal(cat)}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add project
                </button>
              </div>
            </section>
          );
        })}
      </main>

      <footer>
        <span className="footer-name" onDoubleClick={editFooterName}>
          {footerName}
        </span>
        <span className="footer-note">
          {editMode
            ? "Edit mode · Drag to reorder · ✎ edit · ✕ remove"
            : "Click any card to visit the project"}
        </span>
      </footer>

      {/* Add / Edit Project Modal */}
      <div
        className={"modal-overlay" + (projectModalOpen ? " open" : "")}
        onClick={(e) =>
          e.target === e.currentTarget && closeProjectModal()
        }
      >
        <div className="modal">
          <h3 className="modal-title">
            {editingId != null
              ? activeCategory && EDIT_TITLES[activeCategory]
              : activeCategory && ADD_TITLES[activeCategory]}
          </h3>
          <div>
            <label>Project Name</label>
            <input
              ref={nameInputRef}
              type="text"
              placeholder="My Awesome Project"
              value={form.name}
              style={invalid.name ? invalidStyle : undefined}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label>URL</label>
            <input
              type="url"
              placeholder="https://myproject.com"
              value={form.url}
              style={invalid.url ? invalidStyle : undefined}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            />
          </div>
          <div>
            <label>
              Short Description <span style={{ opacity: 0.4 }}>(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="A brief description of what this project does…"
              value={form.desc}
              onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
            />
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={closeProjectModal}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={saveProject}
              disabled={saving}
            >
              {saving ? "Saving…" : editingId != null ? "Save →" : "Add →"}
            </button>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      <div
        className={"modal-overlay" + (contactOpen ? " open" : "")}
        onClick={(e) => e.target === e.currentTarget && setContactOpen(false)}
      >
        <div className="modal" style={{ maxWidth: 380 }}>
          <h3 className="modal-title">Get in Touch</h3>
          <div className="contact-options">
            <button className="contact-option" onClick={copyEmail}>
              <span className="contact-icon">✉</span>
              <div>
                <p className="contact-label">Email</p>
                <p className="contact-value">jackoseik@gmail.com</p>
              </div>
              <span className="contact-hint">{copyHint}</span>
            </button>
            <a
              className="contact-option"
              href="https://wa.me/233559109933"
              target="_blank"
              rel="noopener"
            >
              <span className="contact-icon">💬</span>
              <div>
                <p className="contact-label">WhatsApp</p>
                <p className="contact-value">+233 55 910 9933</p>
              </div>
              <span className="contact-hint">Open →</span>
            </a>
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setContactOpen(false)}>
              Close
            </button>
          </div>
        </div>
      </div>

      {/* PIN Modal */}
      <div
        className={"modal-overlay" + (pinOpen ? " open" : "")}
        onClick={(e) => e.target === e.currentTarget && closePinModal()}
      >
        <div className="modal" style={{ maxWidth: 300, gap: 16 }}>
          <h3 className="modal-title">Enter PIN</h3>
          <div className="pin-dots">
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                className={"pin-dot" + (i < pinBuffer.length ? " filled" : "")}
              />
            ))}
          </div>
          <p className="pin-error">{pinError}</p>
          <div className="pin-keypad">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
              <button key={n} className="pin-key" onClick={() => pinKey(n)}>
                {n}
              </button>
            ))}
            <button
              className="pin-key"
              style={{ fontSize: 12, letterSpacing: "0.05em" }}
              onClick={() => pinKey("back")}
            >
              ⌫
            </button>
            <button className="pin-key" onClick={() => pinKey("0")}>
              0
            </button>
            <button
              className="pin-key"
              style={{ fontSize: 11, letterSpacing: "0.1em" }}
              onClick={closePinModal}
            >
              ESC
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const invalidStyle: CSSProperties = { borderColor: "var(--ui-accent)" };

function ProjectCard({
  project,
  cat,
  editMode,
  dragging,
  dragOver,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  project: Project;
  cat: Category;
  editMode: boolean;
  dragging: boolean;
  dragOver: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <a
      className={
        "card" + (dragging ? " dragging" : "") + (dragOver ? " drag-over" : "")
      }
      href={safeHref(project.url)}
      target="_blank"
      rel="noopener"
      draggable={editMode}
      onDragStart={editMode ? onDragStart : undefined}
      onDragEnd={editMode ? onDragEnd : undefined}
      onDragOver={editMode ? onDragOver : undefined}
      onDragLeave={editMode ? onDragLeave : undefined}
      onDrop={editMode ? onDrop : undefined}
    >
      {editMode && (
        <button
          className="card-edit"
          title="Edit"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
        >
          ✎
        </button>
      )}
      {editMode && (
        <button
          className="card-delete"
          title="Remove"
          onClick={(e) => {
            e.preventDefault();
            onDelete();
          }}
        >
          ✕
        </button>
      )}
      <div className="card-thumb">
        {!loaded && (
          <div className="thumb-placeholder">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span>{error ? "No preview" : "Loading preview…"}</span>
          </div>
        )}
        {!error && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={thumbUrl(project.url)}
            alt={`${project.name} preview`}
            className={loaded ? "loaded" : ""}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
          />
        )}
      </div>
      <div className="card-body">
        <p className="card-name">{project.name}</p>
        {project.desc && <p className="card-desc">{project.desc}</p>}
        <p className="card-url">{cleanUrl(project.url)}</p>
        <span className="card-arrow">→</span>
      </div>
    </a>
  );
}
