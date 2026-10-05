"use client";

import {
  ArrowRight,
  ArrowUp,
  BarChart3,
  Check,
  ChevronRight,
  CircleQuestionMark,
  Clock3,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import type { DragEvent, FormEvent, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import styles from "./DataDetective.module.css";
import SukiLoadingMark from "@/components/SukiLoadingMark";

type Artifact = {
  id: string;
  path: string;
  filename: string;
  turnId: string | null;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "working" | "done" | "error";
  progress?: string[];
  artifacts?: Artifact[];
};

type StreamEvent =
  | { type: "session"; sessionId: string }
  | { type: "progress"; step: string; label: string }
  | { type: "answer_delta"; text: string }
  | { type: "answer"; text: string }
  | { type: "artifacts"; artifacts: Artifact[] }
  | { type: "complete" }
  | { type: "error"; message: string };

const STORAGE_KEY = "data-detective-session-v1";
const MAX_CSV_BYTES = 5 * 1024 * 1024;
const SAMPLE_QUESTION = "What patterns do you see in monthly revenue? Compare the products and point out anything unusual.";
const QUESTION_STARTERS = [
  "Which product contributes most to revenue?",
  "How does revenue change over time?",
  "Are there any unusual values or missing data?",
];

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function artifactHref(sessionId: string, artifact: Artifact, inline = false) {
  const base = `/api/data-detective/artifact/${encodeURIComponent(sessionId)}/${encodeURIComponent(artifact.id)}`;
  return inline ? `${base}?inline=1` : base;
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export default function DataDetective() {
  const [file, setFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState("");
  const [datasetSize, setDatasetSize] = useState(0);
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          sessionId?: string;
          datasetName?: string;
          datasetSize?: number;
          messages?: ChatMessage[];
        };
        // Restoring persisted browser state before syncing future edits is an intentional external-store sync.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSessionId(parsed.sessionId ?? "");
        setDatasetName(parsed.datasetName ?? "");
        setDatasetSize(parsed.datasetSize ?? 0);
        setMessages((parsed.messages ?? []).map((message): ChatMessage => message.status === "working"
          ? {
              ...message,
              status: "error",
              content: message.content || "This browser stopped receiving the analysis. Ask a new follow-up to continue this session.",
            }
          : message));
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ sessionId, datasetName, datasetSize, messages: messages.slice(-30) }),
      );
    } catch {
      // The active session still works if the browser blocks local storage.
    }
  }, [hydrated, sessionId, datasetName, datasetSize, messages]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function setAssistantMessage(messageId: string, update: (message: ChatMessage) => ChatMessage) {
    setMessages((current) => current.map((message) => (message.id === messageId ? update(message) : message)));
  }

  function acceptFile(nextFile: File) {
    if (!nextFile.name.toLowerCase().endsWith(".csv")) {
      setError("Choose a CSV file to get started.");
      return;
    }
    if (nextFile.size > MAX_CSV_BYTES) {
      setError("CSV files can be up to 5 MB.");
      return;
    }
    if (!nextFile.size) {
      setError("That CSV file is empty.");
      return;
    }
    setError("");
    setSessionId("");
    setMessages([]);
    setFile(nextFile);
    setDatasetName(nextFile.name);
    setDatasetSize(nextFile.size);
    setQuestion("");
  }

  async function askData(questionText: string, fileOverride?: File) {
    const cleanQuestion = questionText.trim();
    const selectedFile = fileOverride ?? file;
    if (!cleanQuestion || busy) return;
    if (!sessionId && !selectedFile) {
      setError("Upload a CSV or try the sample dataset first.");
      return;
    }
    setError("");
    setBusy(true);
    setQuestion("");

    const userMessage: ChatMessage = { id: makeId(), role: "user", content: cleanQuestion };
    const assistantMessage: ChatMessage = {
      id: makeId(),
      role: "assistant",
      content: "",
      status: "working",
      progress: ["Starting the analysis sandbox"],
    };
    setMessages((current) => [...current, userMessage, assistantMessage]);

    try {
      const form = new FormData();
      form.append("question", cleanQuestion);
      form.append("submissionId", makeId());
      if (sessionId) form.append("sessionId", sessionId);
      else if (selectedFile) form.append("file", selectedFile, selectedFile.name);

      const response = await fetch("/api/data-detective", { method: "POST", body: form });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "The analysis could not be started.");
      }
      if (!response.body) throw new Error("The analysis stream is unavailable in this browser.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let ended = false;

      const handleEvent = (event: StreamEvent) => {
        if (event.type === "session") {
          setSessionId(event.sessionId);
        } else if (event.type === "progress") {
          setAssistantMessage(assistantMessage.id, (message) => ({
            ...message,
            progress: [...(message.progress ?? []), event.label].filter((label, index, list) => list.indexOf(label) === index),
          }));
        } else if (event.type === "answer_delta") {
          setAssistantMessage(assistantMessage.id, (message) => ({ ...message, content: message.content + event.text }));
        } else if (event.type === "answer") {
          setAssistantMessage(assistantMessage.id, (message) => ({ ...message, content: event.text }));
        } else if (event.type === "artifacts") {
          setAssistantMessage(assistantMessage.id, (message) => ({ ...message, artifacts: event.artifacts }));
        } else if (event.type === "complete") {
          ended = true;
          setAssistantMessage(assistantMessage.id, (message) => ({
            ...message,
            content: message.content || "Your analysis is complete. Report and chart files are attached when available below.",
            status: "done",
          }));
        } else if (event.type === "error") {
          ended = true;
          setAssistantMessage(assistantMessage.id, (message) => ({
            ...message,
            content: message.content || event.message,
            status: "error",
          }));
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const data = frame
            .split(/\r?\n/)
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trimStart())
            .join("\n");
          if (!data) continue;
          try {
            handleEvent(JSON.parse(data) as StreamEvent);
          } catch {
            // Ignore malformed intermediary frames and continue consuming the stream.
          }
        }
      }

      if (!ended) {
        setAssistantMessage(assistantMessage.id, (message) => ({
          ...message,
          content: message.content || "The connection ended before the analysis finished. You can try again in this session.",
          status: "error",
        }));
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Something went wrong while analyzing the file.";
      setAssistantMessage(assistantMessage.id, (current) => ({ ...current, content: current.content || message, status: "error" }));
    } finally {
      setBusy(false);
    }
  }

  async function trySample() {
    setError("");
    try {
      const response = await fetch("/sample-data/retail_sales.csv");
      if (!response.ok) throw new Error("The sample dataset could not be loaded.");
      const sampleFile = new File([await response.blob()], "retail_sales.csv", { type: "text/csv" });
      acceptFile(sampleFile);
      await askData(SAMPLE_QUESTION, sampleFile);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The sample dataset could not be loaded.");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void askData(question);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) acceptFile(droppedFile);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (question.trim()) void askData(question);
    }
  }

  function newSession() {
    setFile(null);
    setDatasetName("");
    setDatasetSize(0);
    setSessionId("");
    setMessages([]);
    setQuestion("");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");

  return (
    <main className={styles.appShell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}></span>
          <span>data<span className={styles.brandAccent}>detective</span></span>
        </div>

        <div className={styles.sidebarLabel}>YOUR WORKSPACE</div>
        <div className={styles.navItemActive}><BarChart3 size={17} /><span>Analysis room</span><span className={styles.navDot} /></div>

        <div className={styles.sidebarLabelWithRule}><span>DATASET</span><span className={styles.rule} /></div>
        <div
          className={`${styles.uploadCard} ${dragActive ? styles.uploadCardActive : ""}`}
          onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => { if (event.currentTarget === event.target) setDragActive(false); }}
          onDrop={handleDrop}
        >
          <div className={styles.uploadIcon}>{datasetName ? <FileSpreadsheet size={18} /> : <Upload size={18} />}</div>
          {datasetName ? (
            <div className={styles.fileDetails}>
              <strong title={datasetName}>{datasetName}</strong>
              <span>{datasetSize ? formatBytes(datasetSize) : "Session dataset"}{sessionId ? " · connected" : " · ready to analyze"}</span>
            </div>
          ) : (
            <div className={styles.uploadCopy}><strong>Drop a CSV here</strong><span>or browse from your device</span></div>
          )}
          <button className={styles.browseButton} type="button" onClick={() => fileInputRef.current?.click()}>
            {datasetName ? "Change file" : "Choose CSV"}
          </button>
          <input
            ref={fileInputRef}
            className={styles.hiddenInput}
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              const selected = event.target.files?.[0];
              if (selected) acceptFile(selected);
              event.currentTarget.value = "";
            }}
          />
        </div>
        <div className={styles.csvNote}><ShieldCheck size={14} /><span>CSV only · up to 5 MB</span></div>

        <div className={styles.sidebarSection}>
          <div className={styles.sidebarLabelWithRule}><span>SESSION</span><span className={styles.rule} /></div>
          <div className={styles.sessionCard}>
            <div className={styles.sessionIcon}><Database size={17} /></div>
            <div><strong>{sessionId ? (busy ? "Analysis in progress" : "Session ready") : "Ready to explore"}</strong><span>{messages.length ? `${Math.ceil(messages.length / 2)} exchanges` : "A fresh workspace"}</span></div>
          </div>
        </div>

        <div className={styles.sidebarSpacer} />
        <div className={styles.sidebarTip}>
          <div className={styles.tipIcon}><CircleQuestionMark size={16} /></div>
          <div><strong>Keep asking</strong><p>Follow up in this session to dig into another angle of the same dataset.</p></div>
        </div>
        <div className={styles.sidebarFooter}><span className={styles.onlineDot} /> Private session <span className={styles.footerDivider}>·</span> Isolated sandbox</div>
      </aside>

      <section className={styles.mainPanel}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}><span>WORKSPACE</span><ChevronRight size={13} /><strong>DATA DETECTIVE</strong></div>
          <div className={styles.topbarRight}>
            <div className={styles.secureBadge}><ShieldCheck size={14} /><span>OpenAI-hosted Python sandbox</span></div>
            <button className={styles.newSessionButton} type="button" onClick={newSession} disabled={busy}><RotateCcw size={14} /> New analysis</button>
          </div>
        </header>

        <div className={styles.workspace}>
          <div className={styles.pageIntro}>
            <div className={styles.eyebrow}><span className={styles.eyebrowLine} /> INTERACTIVE DATA WORKSPACE</div>
            <h1>Find the story <span>in your data.</span></h1>
            <p>Ask a question. Your analyst will inspect the CSV, run Python, and show its work.</p>
          </div>

          {!messages.length ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIllustration} aria-hidden="true">
                <div className={styles.chartGrid}><i /><i /><i /><i /><i /><i /><i /><i /></div>
                <div className={styles.chartLine}><span /><span /><span /><span /><span /></div>
                <div className={styles.chartBadge}></div>
              </div>
              <div className={styles.emptyEyebrow}>YOUR NEXT DISCOVERY</div>
              <h2>Start with a question.<br /><span>Leave with a clearer picture.</span></h2>
              <p>Upload your own data or take a quick look at the sample sales file. You can ask follow-ups, too.</p>
              <button className={styles.sampleButton} type="button" onClick={() => void trySample()} disabled={busy}>
                {busy ? <SukiLoadingMark size={16} /> : null}
                Try the sample dataset
                <ArrowRight size={16} />
              </button>
              <div className={styles.starterLabel}>OR TRY A QUESTION</div>
              <div className={styles.starterQuestions}>
                {QUESTION_STARTERS.map((starter) => (
                  <button key={starter} type="button" onClick={() => setQuestion(starter)}>{starter}<ArrowUp size={13} /></button>
                ))}
              </div>
              <div className={styles.privacyNote}><ShieldCheck size={14} /> Your file is sent only to the server and the isolated analysis sandbox.</div>
            </div>
          ) : (
            <div className={styles.conversation}>
              {messages.map((message) => (
                <article key={message.id} className={message.role === "user" ? styles.userMessage : styles.assistantMessage}>
                  {message.role === "user" ? (
                    <>
                      <div className={styles.userAvatar}>Y</div>
                      <div className={styles.userBubble}>{message.content}</div>
                    </>
                  ) : (
                    <>
                      <div className={styles.agentAvatar}></div>
                      <div className={styles.assistantBody}>
                        <div className={styles.assistantHeading}><strong>Data Detective</strong><span><span className={message.status === "error" ? styles.statusDotError : styles.statusDot} />{message.status === "working" ? "ANALYZING" : message.status === "error" ? "NEEDS ATTENTION" : "ANALYSIS"}</span></div>
                        {message.status === "working" && (
                          <div className={styles.progressCard}>
                            <div className={styles.progressSpinner}><SukiLoadingMark size={20} /></div>
                            <div className={styles.progressText}>
                              <strong>{message.progress?.at(-1) || "Working through the data"}</strong>
                              <span><Clock3 size={12} /> This can take a moment for a larger CSV</span>
                            </div>
                            <div className={styles.progressBars}><i /><i /><i /></div>
                          </div>
                        )}
                        {message.content && <div className={styles.assistantText}>{message.content}</div>}
                        {!message.content && message.status === "working" && <div className={styles.waitingText}>The agent is inspecting columns and preparing the analysis…</div>}
                        {message.artifacts && message.artifacts.length > 0 && sessionId && (
                          <div className={styles.artifactSection}>
                            {message.artifacts.some((item) => /\.png$/i.test(item.filename)) && (
                              <div className={styles.chartPreview}>
                                <div className={styles.chartPreviewHeader}><span><BarChart3 size={15} /> VISUAL FINDING</span><span>PYTHON · MATPLOTLIB</span></div>
                                {message.artifacts.filter((item) => /\.png$/i.test(item.filename)).map((artifact) => (
                                  <a key={artifact.id} href={artifactHref(sessionId, artifact)} download={artifact.filename} className={styles.chartLink}>
                                    {/* The artifact is served by the application server, never directly from OpenAI with a browser key. */}
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={artifactHref(sessionId, artifact, true)} alt={`Analysis chart: ${artifact.filename}`} />
                                    <span>{artifact.filename}<ArrowUp size={13} /></span>
                                  </a>
                                ))}
                              </div>
                            )}
                            <div className={styles.downloadRow}>
                              <div><FileText size={17} /><span><strong>Findings report</strong><small>Report and supporting files from this turn</small></span></div>
                              <div className={styles.downloadLinks}>
                                {message.artifacts.map((artifact) => (
                                  <a key={artifact.id} href={artifactHref(sessionId, artifact)} download={artifact.filename} title={`Download ${artifact.filename}`}>
                                    <Download size={14} /> {artifact.filename}
                                  </a>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        {message.status === "done" && (!message.artifacts || message.artifacts.length === 0) && (
                          <div className={styles.artifactFallback}><FileText size={14} /> OpenAI completed the analysis, but no downloadable artifact was returned for this turn.</div>
                        )}
                      </div>
                    </>
                  )}
                </article>
              ))}
              <div ref={conversationEndRef} />
            </div>
          )}

          {error && <div className={styles.errorBanner}><X size={15} /><span>{error}</span><button type="button" onClick={() => setError("")} aria-label="Dismiss error"><X size={14} /></button></div>}

          <div className={styles.composerWrap}>
            {messages.length > 0 && !busy && latestAssistant?.status === "done" && (
              <div className={styles.followupHint}><MessageCircle size={14} /> Ask a follow-up about {datasetName || "the same dataset"}</div>
            )}
            <form className={styles.composer} onSubmit={handleSubmit}>
              {!sessionId && !file && (
                <button className={styles.composerUpload} type="button" onClick={() => fileInputRef.current?.click()} aria-label="Upload a CSV"><Upload size={17} /></button>
              )}
              <textarea
                aria-label="Ask a question about your data"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder={sessionId ? "Ask a follow-up about your data…" : file ? "What would you like to know about this CSV?" : "Upload a CSV to start asking questions…"}
                rows={1}
                disabled={busy}
              />
              <button className={styles.sendButton} type="submit" disabled={busy || !question.trim() || (!sessionId && !file)} aria-label="Send question">
                {busy ? <SukiLoadingMark size={18} /> : <ArrowUp size={18} />}
              </button>
            </form>
            <div className={styles.composerFooter}><span>Data Detective may make mistakes. Verify key decisions against your source data.</span><span><kbd>↵</kbd> send <i /> <kbd>shift + ↵</kbd> new line</span></div>
          </div>

          <div className={styles.workspaceFooter}><span><Check size={12} /> Python execution runs in an OpenAI-hosted sandbox</span><span>DATA DETECTIVE <i /> POWERED BY OPENAI AGENTS</span></div>
        </div>
      </section>
    </main>
  );
}
