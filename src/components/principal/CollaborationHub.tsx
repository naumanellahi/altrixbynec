// src/components/principal/CollaborationHub.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { encryptMessage, decryptMessage } from "@/lib/crypto/ptEncryption";
import { MessageSquare } from "lucide-react";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

interface Message {
  id: string;
  convo_id: string;
  sender_id: string;
  encrypted_body: { iv: string; data: string };
  created_at: string;
}

export function CollaborationHub() {
  const { user } = useSession();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // Load conversations for the current school
  useEffect(() => {
    if (!user) return;
    const fetchConvos = async () => {
      const { data, error } = await supabase
        .from("pt_conversations")
        .select("id, title, created_at")
        .eq("school_id", user?.app_metadata?.school_id);
      if (!error && data) setConvos(data);
    };
    fetchConvos();
  }, [user]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConvo) return;
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("pt_messages")
        .select("id, convo_id, sender_id, encrypted_body, created_at")
        .eq("convo_id", activeConvo)
        .order("created_at", { ascending: true });
      if (!error && data) setMessages(data);
    };
    fetchMessages();
    const channel = supabase
      .channel(`private:pt_messages_${activeConvo}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pt_messages", filter: `convo_id=eq.${activeConvo}` },
        (payload) => {
          if (payload.new) setMessages((msgs) => [...msgs, payload.new as Message]);
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [activeConvo]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConvo) return;
    const encrypted = await encryptMessage(newMessage);
    await supabase.from("pt_messages").insert({
      convo_id: activeConvo,
      sender_id: user?.id,
      encrypted_body: encrypted,
    });
    setNewMessage("");
  };

  const decrypt = async (msg: Message) => {
    const plain = await decryptMessage(msg.encrypted_body);
    return plain;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Conversation List */}
      <aside className="border-r pr-2 overflow-y-auto max-h-[70vh]">
        <h2 className="font-display text-lg mb-2">Conversations</h2>
        <ul>
          {convos.map((c) => (
            <li key={c.id} className="mb-2">
              <button
                className={`w-full text-left px-2 py-1 rounded ${c.id === activeConvo ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                onClick={() => setActiveConvo(c.id)}
              >
                {c.title}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Chat Window */}
      <section className="col-span-2 flex flex-col h-[70vh]">
        {activeConvo ? (
          <>
            <div className="flex-1 overflow-y-auto mb-2" id="chat-scroll">
              {messages.map((m) => (
                <div key={m.id} className={`mb-2 ${m.sender_id === user?.id ? "text-right" : "text-left"}`}>
                  <span className="inline-block bg-muted rounded-xl px-3 py-1 max-w-xs break-words">
                    {/* Decrypt on the fly */}
                    <MessageBody message={m} />
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                className="flex-1 border rounded-xl px-3 py-1"
                placeholder="Type a message…"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button
                className="p-2 bg-primary text-primary-foreground rounded-xl"
                onClick={sendMessage}
                aria-label="Send message"
              >
                <MessageSquare className="h-5 w-5" />
              </button>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">Select a conversation to begin chatting.</p>
        )}
      </section>
    </div>
  );
}

// Helper component to decrypt and display a message body lazily
function MessageBody({ message }: { message: Message }) {
  const [plain, setPlain] = useState<string>("Loading…");
  useEffect(() => {
    (async () => {
      const txt = await decryptMessage(message.encrypted_body);
      setPlain(txt);
    })();
  }, [message]);
  return <span>{plain}</span>;
}
