import { useState, useEffect, useRef } from "react";
import { Extension, mergeAttributes } from "@tiptap/core";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import toast from "react-hot-toast";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  ImagePlus,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Link as LinkIcon,
  Undo,
  Redo,
  Save,
  Trash2,
  X,
  Download,
  Upload,
} from "lucide-react";
import DeleteNoteDialog from "./DeleteNoteDialog";
import { uploadNoteImageFile } from "../../api/uploadApi";
import { sanitizeHtml } from "../../utils/sanitizeHtml";
import PropTypes from "prop-types";
import { noteShape } from "../../utils/propTypes";

// ── Toolbar button ───────────────────────────────────────────────
function ToolbarBtn({ onClick, active, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      aria-label={title}
      aria-pressed={active !== undefined ? active : undefined}
      className={`flex-shrink-0 rounded p-1.5 text-sm transition-colors ${
        active
          ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
          : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />;
}

const EMPTY_EDITOR_HTML = "<p></p>";
const DEFAULT_IMAGE_ALIGN = "center";
const DEFAULT_TEXT_ALIGN = "left";
const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;
const MAX_TEXT_IMPORT_FILE_SIZE = 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const TEXT_ALIGNMENTS = ["left", "center", "right", "justify"];
const TEXT_ALIGNABLE_TYPES = [
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
];
const EDITOR_BODY_CLASS =
  "tiptap-content min-h-[300px] text-gray-800 focus:outline-none dark:text-gray-100";
const READONLY_RENDER_CLASS = `tiptap-content tiptap-readonly`;

function normalizeImageAlign(value) {
  return ["left", "center", "right"].includes(value)
    ? value
    : DEFAULT_IMAGE_ALIGN;
}

function normalizeTextAlign(value) {
  return TEXT_ALIGNMENTS.includes(value) ? value : DEFAULT_TEXT_ALIGN;
}

function getImageAlignmentStyle(value) {
  const align = normalizeImageAlign(value);

  if (align === "left") {
    return "display: block; margin-left: 0; margin-right: auto";
  }

  if (align === "right") {
    return "display: block; margin-left: auto; margin-right: 0";
  }

  return "display: block; margin-left: auto; margin-right: auto";
}

function isBlobUrl(value) {
  return typeof value === "string" && value.startsWith("blob:");
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function plainTextToEditorHtml(text) {
  if (!text || !text.trim()) {
    return EMPTY_EDITOR_HTML;
  }

  const normalizedText = text.replace(/\r\n?|\u2028|\u2029/g, "\n");
  const lines = normalizedText.split("\n");

  return lines
    .map((line) => (line ? `<p>${escapeHtml(line)}</p>` : "<p><br></p>"))
    .join("");
}

function htmlToPlainText(html) {
  if (!html) {
    return "";
  }

  if (typeof window === "undefined" || !window.DOMParser) {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .trim();
  }

 const parser = new window.DOMParser();
const doc = parser.parseFromString(html, "text/html");

// 1. Convert <br> tags to actual newline characters
doc.querySelectorAll('br').forEach(br => br.replaceWith('\n'));

// 2. Add a newline after block elements to prevent squashed text (includes h4-h6 for safe pasting)
doc.querySelectorAll('p, div, li, blockquote,  h1, h2, h3').forEach(block => {
  block.insertAdjacentText('afterend', '\n');
});

// 3. Extract text, normalize non-breaking spaces, and trim edges
return (doc.body.textContent || "").replace(/\u00a0/g, " ").trim();
}

function buildTxtFileName(title) {
  const baseName = (title || "note")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${baseName || "note"}.txt`;
}

function getTitleFromFileName(fileName = "") {
  return fileName.replace(/\.txt$/i, "").trim();
}

function normalizeHtmlForEditor(html) {
  if (!html) {
    return EMPTY_EDITOR_HTML;
  }

  const htmlWithEscapedCode = html.replace(
    /<code>([\s\S]*?)<\/code>/gi,
    (_, innerHtml) => {
      const escapedInnerHtml = innerHtml
        .replace(/&(?!(?:[a-zA-Z]+|#\d+|#x[\da-fA-F]+);)/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      return `<code>${escapedInnerHtml}</code>`;
    },
  );

  if (typeof window === "undefined" || !window.DOMParser) {
    return htmlWithEscapedCode;
  }

  const parser = new window.DOMParser();
  const doc = parser.parseFromString(htmlWithEscapedCode, "text/html");

  if (!doc.body.innerHTML) {
    return EMPTY_EDITOR_HTML;
  }

  return doc.body.innerHTML || EMPTY_EDITOR_HTML;
}

function extractImageAlignments(html) {
  if (!html || typeof window === "undefined" || !window.DOMParser) {
    return [];
  }

  const parser = new window.DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  return Array.from(doc.querySelectorAll("img")).map((image) =>
    normalizeImageAlign(image.getAttribute("data-align")),
  );
}

function applyImageAlignmentsToEditor(editor, html) {
  if (!editor) return;

  const alignments = extractImageAlignments(html);
  if (!alignments.length) return;

  editor.commands.command(({ tr, state, dispatch }) => {
    let imageIndex = 0;

    state.doc.descendants((node, pos) => {
      if (node.type.name !== "image") {
        return true;
      }

      const nextAlign = alignments[imageIndex];
      imageIndex += 1;

      if (!nextAlign || node.attrs.align === nextAlign) {
        return true;
      }

      tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        align: nextAlign,
      });

      return true;
    });

    if (dispatch && tr.docChanged) {
      dispatch(tr);
    }

    return true;
  });
}

function normalizeHtmlForViewer(html) {
  if (!html || typeof window === "undefined" || !window.DOMParser) {
    return sanitizeHtml(html || "");
  }

  const parser = new window.DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  doc.querySelectorAll("img").forEach((image) => {
    const align = normalizeImageAlign(image.getAttribute("data-align"));
    image.setAttribute("data-align", align);
  });

  return sanitizeHtml(doc.body.innerHTML || "");
}

function setEditorContentWithImageAlignments(editor, html) {
  if (!editor || editor.isDestroyed) return;

  editor.commands.setContent(html);
  applyImageAlignmentsToEditor(editor, html);

  if (typeof window !== "undefined") {
    return window.setTimeout(() => {
      if (!editor.isDestroyed) {
        applyImageAlignmentsToEditor(editor, html);
      }
    }, 0);
  }
}

const TextAlignExtension = Extension.create({
  name: "textAlign",

  addGlobalAttributes() {
    return [
      {
        types: TEXT_ALIGNABLE_TYPES,
        attributes: {
          textAlign: {
            default: DEFAULT_TEXT_ALIGN,
            parseHTML: (element) =>
              normalizeTextAlign(
                element.style?.textAlign ||
                  element.getAttribute("data-text-align"),
              ),
            renderHTML: (attributes) => {
              const textAlign = normalizeTextAlign(attributes.textAlign);

              if (textAlign === DEFAULT_TEXT_ALIGN) {
                return {};
              }

              return {
                "data-text-align": textAlign,
                style: `text-align: ${textAlign}`,
              };
            },
          },
        },
      },
    ];
  },
});

const RichImage = Image.extend({
  parseHTML() {
    return [
      {
        tag: "img[src]",
        getAttrs: (element) => {
          if (!element || typeof element.getAttribute !== "function") {
            return false;
          }

          return {
            src: element.getAttribute("src"),
            alt: element.getAttribute("alt"),
            title: element.getAttribute("title"),
            align: normalizeImageAlign(element.getAttribute("data-align")),
          };
        },
      },
    ];
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: DEFAULT_IMAGE_ALIGN,
        parseHTML: (element) =>
          normalizeImageAlign(element.getAttribute("data-align")),
        renderHTML: (attributes) => ({
          "data-align": normalizeImageAlign(attributes.align),
        }),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const {
      align,
      class: className,
      style,
      ...restAttributes
    } = HTMLAttributes;
    const normalizedAlign = normalizeImageAlign(align);
    const mergedStyle = [
      style?.trim().replace(/;$/, ""),
      getImageAlignmentStyle(normalizedAlign),
    ]
      .filter(Boolean)
      .join("; ");

    return [
      "img",
      mergeAttributes(this.options.HTMLAttributes, restAttributes, {
        "data-align": normalizedAlign,
        class: [
          "note-editor-image",
          `note-editor-image--${normalizedAlign}`,
          className,
        ]
          .filter(Boolean)
          .join(" "),
        style: mergedStyle,
      }),
    ];
  },
});

function PromptDialog({
  open,
  title,
  description,
  label,
  value,
  placeholder,
  multiline = false,
  confirmLabel = "Apply",
  onChange,
  onClose,
  onConfirm,
}) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    // Save previous focus
    previousFocusRef.current = document.activeElement;

    // Move initial focus to the input/textarea
    if (dialogRef.current) {
      const input = dialogRef.current.querySelector("input, textarea");
      if (input) input.focus();
    }

    const handleKeyDown = (e) => {
      // Handle Escape key
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }

      // Trap focus within the dialog
      if (e.key === "Tab" && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus when the dialog closes
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  const InputTag = multiline ? "textarea" : "input";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/45 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-dialog-title"
        aria-describedby={description ? "prompt-dialog-desc" : undefined}
        className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
      >
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h3
            id="prompt-dialog-title"
            className="text-base font-semibold text-gray-900 dark:text-white"
          >
            {title}
          </h3>
          {description && (
            <p
              id="prompt-dialog-desc"
              className="mt-1 text-sm text-gray-500 dark:text-gray-400"
            >
              {description}
            </p>
          )}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onConfirm();
          }}
          className="space-y-4 px-5 py-4"
        >
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {label}
            </span>
            <InputTag
              autoFocus
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder={placeholder}
              rows={multiline ? 8 : undefined}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-950"
            />
          </label>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

PromptDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  multiline: PropTypes.bool,
  confirmLabel: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

// ── Toolbar ──────────────────────────────────────────────────────
function Toolbar({
  editor,
  selectedImage,
  onOpenLinkDialog,
  onOpenImagePicker,
  onOpenImageUrlDialog,
  onOpenHtmlDialog,
  onAlignImage,
}) {
  if (!editor) return null;

  function setTextAlign(alignment) {
    if (selectedImage && alignment !== "justify") {
      onAlignImage(alignment);
      return;
    }

    const nextAlignment = normalizeTextAlign(alignment);
    const chain = editor.chain().focus();

    TEXT_ALIGNABLE_TYPES.forEach((type) => {
      chain.updateAttributes(type, { textAlign: nextAlignment });
    });

    chain.run();
  }

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto border-b border-gray-100 bg-white px-3 py-2 transition-colors dark:border-gray-700 dark:bg-gray-900">
      {/* Headings */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        title="Heading 1"
      >
        <span className="text-xs font-bold">H1</span>
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        <span className="text-xs font-bold">H2</span>
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        title="Heading 3"
      >
        <span className="text-xs font-bold">H3</span>
      </ToolbarBtn>

      <Divider />

      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Bold"
      >
        <Bold className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Italic"
      >
        <Italic className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="Underline"
      >
        <UnderlineIcon className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="Strikethrough"
      >
        <Strikethrough className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive("code")}
        title="Inline code"
      >
        <Code className="w-3.5 h-3.5" />
      </ToolbarBtn>

      <Divider />

      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Bullet list"
      >
        <List className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Ordered list"
      >
        <ListOrdered className="w-3.5 h-3.5" />
      </ToolbarBtn>

      <Divider />

      <ToolbarBtn
        onClick={() => setTextAlign("left")}
        active={
          selectedImage
            ? selectedImage.align === "left"
            : editor.isActive({ textAlign: "left" })
        }
        title="Align left"
      >
        <AlignLeft className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => setTextAlign("center")}
        active={
          selectedImage
            ? selectedImage.align === "center"
            : editor.isActive({ textAlign: "center" })
        }
        title="Align center"
      >
        <AlignCenter className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => setTextAlign("right")}
        active={
          selectedImage
            ? selectedImage.align === "right"
            : editor.isActive({ textAlign: "right" })
        }
        title="Align right"
      >
        <AlignRight className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => setTextAlign("justify")}
        active={!selectedImage && editor.isActive({ textAlign: "justify" })}
        title="Justify"
      >
        <AlignJustify className="w-3.5 h-3.5" />
      </ToolbarBtn>

      <Divider />

      <ToolbarBtn
        onClick={onOpenLinkDialog}
        active={editor.isActive("link")}
        title="Insert link"
      >
        <LinkIcon className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={onOpenImagePicker}
        active={false}
        title="Upload image"
      >
        <ImagePlus className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={onOpenImageUrlDialog}
        active={false}
        title="Insert image URL"
      >
        <span className="text-[10px] font-semibold">IMG</span>
      </ToolbarBtn>
      <ToolbarBtn onClick={onOpenHtmlDialog} active={false} title="Render HTML">
        <span className="text-[10px] font-semibold">{"<>"}</span>
      </ToolbarBtn>

      <Divider />

      <ToolbarBtn
        onClick={() => editor.chain().focus().undo().run()}
        active={false}
        title="Undo"
      >
        <Undo className="w-3.5 h-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().redo().run()}
        active={false}
        title="Redo"
      >
        <Redo className="w-3.5 h-3.5" />
      </ToolbarBtn>
    </div>
  );
}

// ── NoteEditorPanel ───────────────────────────────────────────────
export default function NoteEditorPanel({ note, onSave, onDiscard, onDelete }) {
  const isNew = note === null;
  const initialHtml = normalizeHtmlForEditor(
    note?.content || EMPTY_EDITOR_HTML,
  );

  const [title, setTitle] = useState(() => note?.title || "");
  const [htmlValue, setHtmlValue] = useState(() => initialHtml);
  const [titleError, setTitleError] = useState("");
  const [contentError, setContentError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(isNew);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [promptDialog, setPromptDialog] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const imageInputRef = useRef(null);
  const textImportInputRef = useRef(null);
  const pendingImageFilesRef = useRef(new Map());
  const uploadedPendingPreviewsRef = useRef(new Set());

  function cleanupObjectUrl(objectUrl) {
    if (!isBlobUrl(objectUrl)) {
      return;
    }

    try {
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Ignore revoke errors for already released object URLs.
    }
  }

  function clearPendingImage(objectUrl) {
    cleanupObjectUrl(objectUrl);
    pendingImageFilesRef.current.delete(objectUrl);
  }

  function clearAllPendingImages() {
    Array.from(pendingImageFilesRef.current.keys()).forEach(clearPendingImage);
  }

  function createLocalImagePreview(file) {
    if (!file) return null;

    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
      toast.error("Please choose a JPG, PNG, or WEBP image.");
      return null;
    }

    if (file.size > MAX_IMAGE_FILE_SIZE) {
      toast.error("Images must be 5MB or smaller.");
      return null;
    }

    const previewUrl = URL.createObjectURL(file);
    pendingImageFilesRef.current.set(previewUrl, file);
    return previewUrl;
  }

  function insertLocalPreviewImage(view, file) {
    const previewUrl = createLocalImagePreview(file);

    if (!previewUrl) {
      return;
    }

    const imageNode = view.state.schema.nodes.image;

    if (!imageNode) {
      return;
    }

    const transaction = view.state.tr.replaceSelectionWith(
      imageNode.create({
        src: previewUrl,
        alt: file.name || "Local image preview",
        align: DEFAULT_IMAGE_ALIGN,
      }),
    );

    view.dispatch(transaction.scrollIntoView());
  }

  async function uploadPendingImagesInHtml(html) {
    if (!html || typeof window === "undefined" || !window.DOMParser) {
      return html;
    }

    const parser = new window.DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const imageElements = Array.from(doc.querySelectorAll("img"));
    const pendingSources = Array.from(
      new Set(
        imageElements
          .map((imageElement) => imageElement.getAttribute("src"))
          .filter(isBlobUrl),
      ),
    );

    if (!pendingSources.length) {
      return html;
    }

    const toastId = toast.loading(
      pendingSources.length === 1
        ? "Uploading image..."
        : `Uploading ${pendingSources.length} images...`,
    );
    const uploadedUrlByPreview = new Map();

    try {
      for (const previewUrl of pendingSources) {
        const file = pendingImageFilesRef.current.get(previewUrl);

        if (!file) {
          throw new Error(
            "A local image preview could not be resolved. Please re-add the image and try again.",
          );
        }

        const uploaded = await uploadNoteImageFile(file);
        const uploadedUrl = uploaded?.url;

        if (!uploadedUrl) {
          throw new Error("No image URL was returned by the server.");
        }

        uploadedUrlByPreview.set(previewUrl, uploadedUrl);

        imageElements.forEach((imageElement) => {
          const currentSrc = imageElement.getAttribute("src");
          if (currentSrc === previewUrl) {
            imageElement.setAttribute("src", uploadedUrl);
          }
        });
        pendingImageFilesRef.current.delete(previewUrl);
        uploadedPendingPreviewsRef.current.add(previewUrl);
      }

      toast.success("Images uploaded successfully.", { id: toastId });
      return doc.body.innerHTML || html;
    } catch (error) {
      toast.dismiss(toastId);

      const partialHtml = doc.body.innerHTML || html;

      if (editor && !isHtmlMode) {
        setEditorContentWithImageAlignments(editor, partialHtml);

        uploadedPendingPreviewsRef.current.forEach((previewUrl) => {
          cleanupObjectUrl(previewUrl);
          uploadedPendingPreviewsRef.current.delete(previewUrl);
        });
      } else {
        setHtmlValue(partialHtml);
        uploadedPendingPreviewsRef.current.forEach((previewUrl) => {
          cleanupObjectUrl(previewUrl);
          uploadedPendingPreviewsRef.current.delete(previewUrl);
        });
      }

      throw error;
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      TextAlignExtension,
      Underline,
      Link.configure({ openOnClick: false }),
      RichImage.configure({
        inline: false,
        allowBase64: true,
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: EDITOR_BODY_CLASS,
      },
      handlePaste(view, event) {
        const clipboardItems = Array.from(event.clipboardData?.items || []);
        const imageItem = clipboardItems.find((item) =>
          item.type.startsWith("image/"),
        );

        if (!imageItem) {
          return false;
        }

        const file = imageItem.getAsFile();

        if (!file) {
          return false;
        }

        event.preventDefault();
        insertLocalPreviewImage(view, file);
        return true;
      },
      handleDrop(view, event) {
        const droppedFiles = Array.from(event.dataTransfer?.files || []);
        const imageFile = droppedFiles.find((file) =>
          file.type.startsWith("image/"),
        );

        if (!imageFile) {
          return false;
        }

        event.preventDefault();
        insertLocalPreviewImage(view, imageFile);
        return true;
      },
    },
    editable: false,
  });

  useEffect(() => {
    if (!editor) return;

    editor.setEditable(isEditing && !isHtmlMode);
  }, [editor, isEditing, isHtmlMode]);

  useEffect(() => {
    if (!editor) return;

    setEditorContentWithImageAlignments(editor, initialHtml);
  }, [editor, initialHtml]);

  useEffect(() => {
    if (!editor) return undefined;

    const syncSelectedImage = () => {
      if (!editor.isActive("image")) {
        setSelectedImage(null);
        return;
      }

      const attributes = editor.getAttributes("image");
      const imageSelectionPosition = editor.state.selection.from;

      setSelectedImage({
        pos: imageSelectionPosition,
        align: normalizeImageAlign(attributes.align),
      });
    };

    syncSelectedImage();
    editor.on("selectionUpdate", syncSelectedImage);
    editor.on("update", syncSelectedImage);

    return () => {
      editor.off("selectionUpdate", syncSelectedImage);
      editor.off("update", syncSelectedImage);
    };
  }, [editor]);

  useEffect(() => {
    const pendingImages = pendingImageFilesRef.current;

    return () => {
      pendingImages.forEach((_, objectUrl) => {
        cleanupObjectUrl(objectUrl);
      });
      pendingImages.clear();
    };
  }, []);

  function resetValidationState() {
    setTitleError("");
    setContentError("");
  }

  function restoreOriginalNote() {
    clearAllPendingImages();
    const nextHtml = normalizeHtmlForEditor(note?.content || EMPTY_EDITOR_HTML);
    setTitle(note?.title || "");
    setHtmlValue(nextHtml);
    setEditorContentWithImageAlignments(editor, nextHtml);
    resetValidationState();
    setIsHtmlMode(false);
  }

  function handleStartEditing() {
    restoreOriginalNote();
    setIsEditing(true);
  }

  function openPromptDialog(config) {
    const selection = editor?.state.selection
      ? {
          from: editor.state.selection.from,
          to: editor.state.selection.to,
        }
      : null;

    setPromptDialog({
      ...config,
      value: config.value || "",
      selection,
    });
  }

  function syncEditorWithHtml(nextHtml) {
    const preparedHtml = normalizeHtmlForEditor(
      nextHtml.trim() ? nextHtml : EMPTY_EDITOR_HTML,
    );

    try {
      setEditorContentWithImageAlignments(editor, preparedHtml);
      const normalizedHtml = editor?.getHTML() || preparedHtml;
      setHtmlValue(normalizedHtml);
      return normalizedHtml;
    } catch {
      toast.error("The HTML could not be parsed. Please fix it and try again.");
      return null;
    }
  }

  function handleSwitchToHtmlMode() {
    setHtmlValue(editor?.getHTML() || htmlValue || EMPTY_EDITOR_HTML);
    setIsHtmlMode(true);
  }

  function handleSwitchToRichTextMode() {
    const syncedHtml = syncEditorWithHtml(htmlValue);
    if (!syncedHtml) return;

    setContentError("");
    setIsHtmlMode(false);
  }

  function handleCancelEditing() {
    if (!isEditing) {
      onDiscard();
      return;
    }

    if (isNew) {
      onDiscard();
      return;
    }

    restoreOriginalNote();
    setIsEditing(false);
  }

  function handleOpenLinkDialog() {
    openPromptDialog({
      type: "link",
      title: "Insert link",
      description: "Add a URL or leave it empty to remove the current link.",
      label: "URL",
      placeholder: "https://example.com",
      confirmLabel: "Apply",
      value: editor?.getAttributes("link").href || "",
    });
  }

  function handleOpenImageUrlDialog() {
    openPromptDialog({
      type: "image",
      title: "Insert image by URL",
      description: "Paste a direct image URL to add it to the note.",
      label: "Image URL",
      placeholder: "https://images.example.com/photo.jpg",
      confirmLabel: "Insert image",
    });
  }

  function handleOpenHtmlDialog() {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, "\n");

    openPromptDialog({
      type: "html",
      title: "Render HTML",
      description:
        "Paste HTML and it will be inserted directly into the document.",
      label: "HTML snippet",
      placeholder: "<h1>Hello world</h1>",
      confirmLabel: "Render",
      multiline: true,
      value: selectedText || "",
    });
  }

  function closePromptDialog() {
    setPromptDialog(null);
  }

  function restoreDialogSelection() {
    if (!editor || !promptDialog?.selection) return editor?.chain().focus();

    return editor.chain().focus().setTextSelection(promptDialog.selection);
  }

  function handlePromptConfirm() {
    if (!editor || !promptDialog) return;

    const nextValue = promptDialog.value.trim();

    if (promptDialog.type === "link") {
      const command = restoreDialogSelection()?.extendMarkRange("link");

      if (!nextValue) {
        command?.unsetLink().run();
        closePromptDialog();
        return;
      }

      command
        ?.setLink({
          href: nextValue,
          target: "_blank",
          rel: "noopener noreferrer",
        })
        .run();
      closePromptDialog();
      return;
    }

    if (promptDialog.type === "image") {
      let isValidImage = false;

      if (nextValue) {
        try {
          // window.location.origin allows valid relative paths to pass parsing
          const url = new URL(nextValue, window.location.origin);
          if (url.protocol === "http:" || url.protocol === "https:") {
            isValidImage = true;
          } else if (url.protocol === "data:") {
            // Ensure data URIs are strictly images
            isValidImage = url.pathname.startsWith("image/");
          }
        } catch {
          isValidImage = false; // Fails URL parsing
        }
      }

      if (!nextValue || !isValidImage) {
        toast.error("Please provide an image URL.");
        return;
      }

      restoreDialogSelection()
        ?.setImage({
          src: nextValue,
          alt: "Inserted image",
          align: DEFAULT_IMAGE_ALIGN, // Assumes DEFAULT_IMAGE_ALIGN is in scope
        })
        .run();
      closePromptDialog();
      return;
    }

    if (promptDialog.type === "html") {
      if (!nextValue) {
        toast.error("Please provide HTML to insert.");
        return;
      }

      const sanitized = sanitizeHtml(nextValue);
      if (!sanitized) {
        toast.error("The provided HTML could not be sanitized.");
        return;
      }

      restoreDialogSelection()?.insertContent(sanitized).run();
      // Ensure any image alignments in the inserted HTML are applied to editor nodes
      applyImageAlignmentsToEditor(editor, sanitized);
      closePromptDialog();
      return;
    }
  }

  function openImagePicker() {
    imageInputRef.current?.click();
  }

  function openTextImportPicker() {
    textImportInputRef.current?.click();
  }

  async function handleTextFileImport(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const isTxtFile = file.name.toLowerCase().endsWith(".txt");

    if (!isTxtFile) {
      toast.error("Only .txt files are supported for import.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_TEXT_IMPORT_FILE_SIZE) {
      toast.error("Text file is too large. Please use a file up to 1MB.");
      event.target.value = "";
      return;
    }

    try {
      const text = await file.text();
      const importedHtml = plainTextToEditorHtml(text);

      if (isHtmlMode) {
        setHtmlValue(importedHtml);
      } else {
        setEditorContentWithImageAlignments(editor, importedHtml);
        setHtmlValue(editor?.getHTML() || importedHtml);
      }

      if (!title.trim()) {
        setTitle(getTitleFromFileName(file.name));
      }

      setContentError("");
      toast.success("Text file imported.");
    } catch {
      toast.error("Could not read this text file.");
    } finally {
      event.target.value = "";
    }
  }

  function handleTextExport() {
    const currentHtml = isHtmlMode
      ? htmlValue
      : editor?.getHTML() || note?.content || "";

    const plainText =
      !isHtmlMode && editor
        ? editor.getText({ blockSeparator: "\n\n" }).trim()
        : htmlToPlainText(currentHtml);

    if (!plainText) {
      toast.error("Nothing to export yet.");
      return;
    }

    const blob = new Blob([plainText], {
      type: "text/plain;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = objectUrl;
    anchor.download = buildTxtFileName(title || note?.title);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(objectUrl);
  }

  async function handleImageSelected(event) {
    const file = event.target.files?.[0];
    const previewUrl = createLocalImagePreview(file);

    if (previewUrl) {
      editor
        ?.chain()
        .focus()
        .setImage({
          src: previewUrl,
          alt: file?.name || "Local image preview",
          align: DEFAULT_IMAGE_ALIGN,
        })
        .run();
    }

    event.target.value = "";
  }

  function updateSelectedImageAttributes(attributes) {
    if (!editor || !selectedImage) return;

    editor
      .chain()
      .focus()
      .setNodeSelection(selectedImage.pos)
      .updateAttributes("image", attributes)
      .run();
  }

  function handleImageAlignChange(align) {
    updateSelectedImageAttributes({ align: normalizeImageAlign(align) });
  }

  async function handleSave() {
    const trimmedTitle = title.trim();
    const currentHtml = isHtmlMode ? htmlValue : editor?.getHTML() || "";
    const html = isHtmlMode ? syncEditorWithHtml(currentHtml) : currentHtml;
    if (!html) return;
    const hasContent = html && html !== "<p></p>" && html.trim() !== "";

    let valid = true;
    if (!trimmedTitle) {
      setTitleError("Title is required");
      valid = false;
    } else {
      setTitleError("");
    }
    if (!hasContent) {
      setContentError("Content is required");
      valid = false;
    } else {
      setContentError("");
    }

    if (!valid) {
      toast.error("Please complete the required fields.");
      return;
    }

    setSaving(true);
    try {
      const finalHtml = await uploadPendingImagesInHtml(html);

      const shouldUpdateEditor = editor && !isHtmlMode && finalHtml !== html;

      if (shouldUpdateEditor) {
        setEditorContentWithImageAlignments(editor, finalHtml);

        // After updating the editor to the new HTML, revoke any uploaded
        // preview object URLs that were waiting for replacement.
        uploadedPendingPreviewsRef.current.forEach((previewUrl) => {
          cleanupObjectUrl(previewUrl);
          uploadedPendingPreviewsRef.current.delete(previewUrl);
        });
      } else {
        // If we didn't update the editor (HTML mode or no change), it's
        // safe to revoke the uploaded preview URLs now.
        uploadedPendingPreviewsRef.current.forEach((previewUrl) => {
          cleanupObjectUrl(previewUrl);
          uploadedPendingPreviewsRef.current.delete(previewUrl);
        });
      }

      setHtmlValue(finalHtml);
      await onSave({ title: trimmedTitle, content: finalHtml });
      if (!isNew) {
        setIsEditing(false);
      }
      toast.success(isNew ? "Note created" : "Note updated");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save note.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!note || !onDelete) return;

    setDeleting(true);
    try {
      await onDelete(note);
      setShowDeleteDialog(false);
    } catch {
      // Delete errors are surfaced by the parent handler.
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 overflow-hidden transition-colors">
      {/* Breadcrumb / action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 text-xs text-gray-400 dark:border-gray-700 dark:text-gray-500 md:px-6">
        <span className="truncate">
          My Notes {note?.title ? `› ${note.title}` : "› New note"}
        </span>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleTextExport}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 hover:cursor-pointer"
          >
            <Download className="w-3 h-3" />
            Export .txt
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={openTextImportPicker}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 hover:cursor-pointer"
            >
              <Upload className="w-3 h-3" />
              Import .txt
            </button>
          )}
          {!isNew && (
            <button
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300 hover:cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          )}
          {isEditing && (
            <div className="flex items-center rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
              <button
                type="button"
                onClick={handleSwitchToRichTextMode}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  !isHtmlMode
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:cursor-pointer"
                }`}
              >
                Rich Text
              </button>
              <button
                type="button"
                onClick={handleSwitchToHtmlMode}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  isHtmlMode
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:cursor-pointer"
                }`}
              >
                HTML
              </button>
            </div>
          )}
          <button
            onClick={handleCancelEditing}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300 hover: cursor-pointer"
          >
            <X className="w-3 h-3" />
            {isEditing ? (isNew ? "Discard" : "Cancel") : "Close"}
          </button>
          {isEditing ? (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 hover: cursor-pointer"
            >
              <Save className="w-3 h-3" />
              {saving ? "Saving…" : "Save"}
            </button>
          ) : (
            <button
              onClick={handleStartEditing}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 hover: cursor-pointer"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="px-4 pb-2 pt-4 md:px-6 md:pt-5">
        {isEditing ? (
          <>
            <label htmlFor="note-title" className="sr-only">
              Note title
            </label>
            <input
              id="note-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleError("");
              }}
              placeholder="Note title…"
              maxLength={200}
              className={`w-full border-0 bg-transparent text-2xl font-bold text-gray-900 outline-none placeholder-gray-300 dark:text-white dark:placeholder-gray-600 ${
                titleError ? "border-b border-red-400" : ""
              }`}
            />
            {titleError && (
              <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                {titleError}
              </p>
            )}
          </>
        ) : (
          <h1 className="break-words text-2xl font-bold text-gray-900 dark:text-white">
            {note?.title || "Untitled note"}
          </h1>
        )}
      </div>

      {/* Metadata row */}
      {note && (
        <div className="flex flex-wrap items-center gap-4 border-b border-gray-50 px-4 py-2 text-xs text-gray-400 dark:border-gray-800 dark:text-gray-500 md:px-6 md:gap-6">
          <span>
            <span className="text-gray-500 dark:text-gray-400 font-medium">
              Last modified
            </span>{" "}
            {formatDateTime(note.updatedAt)}
          </span>
        </div>
      )}

      {isEditing ? (
        <>
          <input
            ref={imageInputRef}
            id="image-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Upload image"
            className="hidden"
            onChange={handleImageSelected}
          />
          <input
            ref={textImportInputRef}
            id="text-import"
            type="file"
            accept=".txt,text/plain"
            aria-label="Import text file"
            className="hidden"
            onChange={handleTextFileImport}
          />

          {!isHtmlMode && (
            <>
              <Toolbar
                editor={editor}
                selectedImage={selectedImage}
                onOpenLinkDialog={handleOpenLinkDialog}
                onOpenImagePicker={openImagePicker}
                onOpenImageUrlDialog={handleOpenImageUrlDialog}
                onOpenHtmlDialog={handleOpenHtmlDialog}
                onAlignImage={handleImageAlignChange}
              />
            </>
          )}

          <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
            {isHtmlMode ? (
              <textarea
                id="html-editor"
                value={htmlValue}
                onChange={(e) => {
                  setHtmlValue(e.target.value);
                  setContentError("");
                }}
                spellCheck={false}
                aria-label="HTML content editor"
                className="h-full min-h-[300px] w-full resize-none border-0 bg-white p-4 font-mono text-sm text-gray-800 outline-none dark:bg-gray-900 dark:text-gray-100"
                placeholder="<p>Write your HTML here...</p>"
              />
            ) : (
              <EditorContent editor={editor} className="h-full" />
            )}

            {contentError && (
              <p className="px-4 text-xs text-red-500 dark:text-red-400 -mt-2">
                {contentError}
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
          <div
            className={`${READONLY_RENDER_CLASS} h-full pointer-events-auto select-text`}
            dangerouslySetInnerHTML={{
              __html: normalizeHtmlForViewer(
                note?.content || htmlValue || EMPTY_EDITOR_HTML,
              ),
            }}
          />
        </div>
      )}

      <DeleteNoteDialog
        note={showDeleteDialog ? note : null}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
        deleting={deleting}
      />

      <PromptDialog
        open={Boolean(promptDialog)}
        title={promptDialog?.title}
        description={promptDialog?.description}
        label={promptDialog?.label}
        value={promptDialog?.value || ""}
        placeholder={promptDialog?.placeholder}
        multiline={Boolean(promptDialog?.multiline)}
        confirmLabel={promptDialog?.confirmLabel}
        onChange={(value) => {
          setPromptDialog((currentDialog) => {
            if (!currentDialog) return currentDialog;

            return {
              ...currentDialog,
              value,
            };
          });
        }}
        onClose={closePromptDialog}
        onConfirm={handlePromptConfirm}
      />
    </div>
  );
}

NoteEditorPanel.propTypes = {
  note: noteShape,
  onSave: PropTypes.func.isRequired,
  onDiscard: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

function formatDateTime(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
