import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Section } from "@/components/Section";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { ConfirmDeleteForm } from "@/components/ConfirmDeleteForm";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";

async function createThread(formData: FormData) {
  "use server";
  const company = await getOrCreateDemoCompany();
  const title = String(formData.get("title") || "New chat").trim() || "New chat";
  const thread = await prisma.chatThread.create({
    data: { companyId: company.id, title },
  });
  await prisma.chatMessage.create({
    data: {
      threadId: thread.id,
      role: "assistant",
      content:
        "Ich bin dein individueller KI-Unternehmensberater. Ich kann dich bei Strategie, KPIs, Entscheidungen, Dokumenten und nächsten Schritten unterstützen. Was kann ich für dich tun?",
    },
  });
  redirect(`/chat/${thread.id}`);
}

export async function deleteThread(formData: FormData) {
  "use server";
  const threadId = String(formData.get("thread_id"));
  if (!threadId) return;
  await prisma.chatMessage.deleteMany({ where: { threadId } });
  await prisma.chatThread.delete({ where: { id: threadId } });
  redirect("/chat");
}

export async function sendMessage(formData: FormData) {
  "use server";
  const threadId = String(formData.get("thread_id"));
  const content = String(formData.get("content") || "").trim();
  if (!threadId || !content) return;

  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    include: { messages: true },
  });
  if (!thread) return;

  await prisma.chatMessage.create({
    data: {
      threadId,
      role: "user",
      content,
    },
  });

  const { generateAdvisorReply } = await import("@/services/chatAdvisor");
  const conversationHistory = thread.messages
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((m) => ({ role: m.role, content: m.content }));

  const { content: advisorReply, citations } = await generateAdvisorReply(
    thread.companyId,
    content,
    conversationHistory
  );

  await prisma.chatMessage.create({
    data: {
      threadId,
      role: "assistant",
      content: advisorReply,
      citationsJson: citations as object,
    },
  });

  redirect(`/chat/${threadId}`);
}

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const params = await searchParams;
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const company = await getOrCreateDemoCompany();
  if (params.new === "1") {
    const title = locale === "de" ? "Neuer KI-Berater Chat" : "New advisor chat";
    const thread = await prisma.chatThread.create({
      data: { companyId: company.id, title },
    });
    await prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        role: "assistant",
        content:
          locale === "de"
            ? "Ich bin dein individueller KI-Unternehmensberater. Ich kann dich bei Strategie, KPIs, Entscheidungen, Dokumenten und nächsten Schritten unterstützen. Was kann ich für dich tun?"
            : "I am your individual AI business advisor. I can help with strategy, KPIs, decisions, documents, and next steps. How can I help you?",
      },
    });
    redirect(`/chat/${thread.id}`);
  }
  const threads = await prisma.chatThread.findMany({
    where: { companyId: company.id },
    include: { messages: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <Section
        title={t.chat.title}
        description={t.chat.description}
        actions={
          <Link
            href="/chat/evaluate"
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700"
          >
            {t.chat.evaluateBtn}
          </Link>
        }
      >
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50/90 p-4 dark:border-amber-600 dark:bg-amber-900/30">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {locale === "de"
              ? "Hinweis: Der Berater-Chat ist jederzeit nutzbar. Je mehr Daten (z. B. Dokumente, KPIs, Runs) vorhanden sind, desto besser und präziser werden die Antworten."
              : "Note: The advisor chat is always available. The more data (e.g., documents, KPIs, runs) is available, the better and more precise the answers will be."}
          </p>
        </div>
        <form action={createThread} className="mb-6 flex gap-3">
          <input
            name="title"
            placeholder={t.chat.chatTitle}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          />
          <button
            type="submit"
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            New Chat
          </button>
        </form>

        <div className="space-y-4">
          {threads.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t.chat.noChats}
            </p>
          ) : (
            threads.map((thread) => (
              <div
                key={thread.id}
                className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="flex items-center justify-between">
                  <Link
                    href={`/chat/${thread.id}`}
                    className="font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
                  >
                    {thread.title}
                  </Link>
                  <div className="flex items-center gap-3">
                    <ConfirmDeleteForm
                      action={deleteThread}
                      confirmMessage={t.chat.deleteConfirm}
                      className="inline"
                    >
                      <input type="hidden" name="thread_id" value={thread.id} />
                      <button
                        type="submit"
                        className="rounded-lg px-2 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
                        title="Delete chat"
                      >
                        {t.chat.deleteChat}
                      </button>
                    </ConfirmDeleteForm>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Section>
    </div>
  );
}
