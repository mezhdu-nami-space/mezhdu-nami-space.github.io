"use client";

import { CSSProperties, FormEvent, useEffect, useRef, useState } from "react";
import { addMonths, format, getDay, getDaysInMonth, parseISO, startOfMonth, subMonths } from "date-fns";
import { ru } from "date-fns/locale";
import { Bell, Cake, CalendarDays, Camera, Check, ChevronLeft, ChevronRight, Copy, Gift, Heart, HelpCircle, KeyRound, Lock, Mail, MessageCircle, NotebookPen, Palette, Plus, Send, Settings, ShieldCheck, Sparkles, Star, Timer, User, X } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

import { NotificationSettings } from "./notification-settings";
import { WishPhotoPicker } from "./wish-photo-picker";
import { WISH_PHOTO_HINT, PHOTO_HINT, preparePhoto } from "@/lib/photo-client";
import { acceptSessionFromUrl, appAction, appGet, appPath, downloadSecretBlob, signOut, uploadMedia, uploadSecretBlob } from "@/lib/supabase-rest";

type Pair = { id: string; name: string; inviteCode: string; theme: string; accent: string; backgroundKey?: string | null; backgroundUrl?: string; relationshipDate: string };
type Member = { id: string; userId: string; displayName: string; role: string; status: string; avatarKey?: string | null; avatarUrl?: string; bio: string; birthDate: string };
type EventItem = { cancelled?: boolean; id: string; authorUserId: string; title: string; eventDate: string; eventTime: string; description: string; category: string; marker: string; color: string; photoKey?: string | null; photoUrl?: string };
type Note = { id: string; authorUserId: string; title: string; content: string; createdAt: string };
type Message = { photoKey?: string | null; photoUrl?: string; id: string; authorUserId: string; authorName: string; content: string; createdAt: string };
type Wish = { id: string; authorUserId: string; authorName: string; title: string; details: string; link: string; photoKey?: string | null; photoUrl?: string; price: string; priority: string; reservedBy?: string | null; fulfilled: boolean };
type Invitation = { id: string; authorUserId: string; authorName: string; title: string; letter: string; eventDate: string; eventTime: string; place: string; status: string };
type Alias = { ownerUserId: string; targetUserId: string; alias: string };
type SecretMessage = { id: string; authorUserId: string; authorName: string; cipherText: string; iv: string; kind: string; mediaKey?: string | null; expiresAt?: string | null; createdAt: string };
type AppData = { user: { id: string; name: string }; onboarding: boolean; waiting?: boolean; pair?: Pair; members?: Member[]; events?: EventItem[]; notes?: Note[]; messages?: Message[]; wishes?: Wish[]; invitations?: Invitation[]; aliases?: Alias[]; secretMessages?: SecretMessage[] };


const themes = [
  { id: "rose", name: "Нежность", colors: "#ff6f91, #ffd2dd" },
  { id: "ocean", name: "Океан", colors: "#137c8b, #b8e5ea" },
  { id: "sunset", name: "Закат", colors: "#dd6336, #ffd39b" },
  { id: "night", name: "Ночная", colors: "#7357c7, #19152b" },
];

async function api(action: string, payload: Record<string, unknown> = {}): Promise<any> {
  return appAction(action, payload);
}

async function uploadPhoto(file: File, purpose: string, targetId = "", content = "") {
  await uploadMedia(await preparePhoto(file, purpose), purpose, targetId, content);
}

export default function CoupleApp() {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [eventOpen, setEventOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [eventDate, setEventDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [savingEvent, setSavingEvent] = useState(false);
  const eventLock = useRef(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [deleteMessageTarget,setDeleteMessageTarget]=useState<Message|null>(null);
  const [deletingMessage,setDeletingMessage]=useState(false);
  const [deleteWish,setDeleteWish]=useState<Wish|null>(null);
  const [wishBusy,setWishBusy]=useState(false);
  const [notificationOpen,setNotificationOpen]=useState(false);
  const seenMessages=useRef<Set<string>|null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [wishOpen, setWishOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [activeLetter, setActiveLetter] = useState<Invitation | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [secretOpen, setSecretOpen] = useState(false);
  const messageRef = useRef<HTMLInputElement>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const [chatFile, setChatFile] = useState<File>();
  const [chatPreview, setChatPreview] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [preparingChat, setPreparingChat] = useState(false);
  useEffect(() => {
    const viewport=window.visualViewport;
    const resize=()=>{document.documentElement.style.setProperty("--visible-height", `${viewport?.height ?? window.innerHeight}px`); document.documentElement.dataset.keyboard=String(window.innerHeight-(viewport?.height ?? window.innerHeight)>150);};
    resize();viewport?.addEventListener("resize",resize);return()=>{viewport?.removeEventListener("resize",resize);delete document.documentElement.dataset.keyboard;};
  },[]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const chatLock = useRef(false);
  useEffect(() => { if(!chatFile){setChatPreview("");return;} const url=URL.createObjectURL(chatFile);setChatPreview(url);return()=>URL.revokeObjectURL(url); },[chatFile]);
  useEffect(() => { messagesEnd.current?.scrollIntoView({block:"nearest"}); },[data?.messages?.length, data?.messages?.at(-1)?.id]);


  const load = async () => {
    try {
      acceptSessionFromUrl();
      const result = await appGet<AppData>();
      if(seenMessages.current){const fresh=(result.messages??[]).filter((m:Message)=>m.authorUserId!==result.user.id&&!seenMessages.current!.has(m.id));if(fresh.length)toast("💌 Новое сообщение от партнёра");}
      seenMessages.current=new Set((result.messages??[]).map((m:Message)=>m.id));
      setData(result);
    } catch (error) {
      if (error instanceof Error && error.message === "AUTH_REQUIRED") { window.location.href = appPath("/login/"); return; }
      toast.error(error instanceof Error ? error.message : "Не удалось загрузить приложение");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    if ("serviceWorker" in navigator) navigator.serviceWorker.register(appPath("/sw.js")).catch(() => undefined);
  }, []);
  useEffect(()=>{const refresh=()=>{if(document.visibilityState==="visible")void load();};const timer=setInterval(refresh,5000);window.addEventListener("focus",refresh);navigator.serviceWorker?.addEventListener("message",refresh);return()=>{clearInterval(timer);window.removeEventListener("focus",refresh);navigator.serviceWorker?.removeEventListener("message",refresh);};},[]);
  useEffect(() => {
    if (!data?.invitations) return;
    const fresh = data.invitations.find(i => i.status === "pending" && i.authorUserId !== data.user.id);
    if (fresh) setActiveLetter(fresh);
  }, [data?.invitations?.length]);

  const run = async (action: string, payload: Record<string, unknown>, close?: () => void) => {
    try { await api(action, payload); close?.(); await load(); toast.success("Готово"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Не удалось сохранить"); }
  };

  if (loading) return <div className="app-loading"><Heart className="pulse-heart" fill="currentColor" /><p>Открываем ваши дни…</p></div>;
  if (!data) return <div className="app-loading"><p>Не удалось открыть приложение</p><Button onClick={load}>Попробовать снова</Button></div>;
  if (data.onboarding) return <Onboarding onDone={load} />;
  if (data.waiting) return <WaitingRoom pair={data.pair!} />;

  const pair = data.pair!;
  const me = data.members?.find(m => m.userId === data.user.id)!;
  const partner = data.members?.find(m => m.userId !== data.user.id);
  const partnerAlias = data.aliases?.find(a => a.ownerUserId === data.user.id && a.targetUserId === partner?.userId)?.alias;
  const pendingPartner = data.members?.find(m => m.status === "pending" && m.userId !== data.user.id);
  const events = data.events ?? [];
  const today = format(new Date(), "yyyy-MM-dd");
  const upcoming = events.filter(e => !e.cancelled && e.eventDate >= today).slice(0, 3);
  const pending = (data.invitations ?? []).filter(i => i.status === "pending" && i.authorUserId !== data.user.id);

  const submitEvent = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (eventLock.current) return;
    eventLock.current = true; setSavingEvent(true);
    const form = new FormData(e.currentTarget);
    try {
      const category = String(form.get("category") || "general");
      const marker = ({ date: "heart", birthday: "cake", anniversary: "ring", important: "star", trip: "diamond", general: "dot" } as Record<string, string>)[category];
      const result = await api(editingEvent ? "updateEvent" : "addEvent", { id: editingEvent?.id, title: form.get("title"), eventDate: form.get("eventDate"), eventTime: form.get("eventTime"), description: form.get("description"), category, marker, color: form.get("color") });
      const photo = form.get("photo");
      if (photo instanceof File && photo.size) {
        try { await uploadPhoto(photo, "event", String(result.id)); } catch { toast.warning("Событие сохранено, но фото не загрузилось"); }
      }
      setEventOpen(false); setEditingEvent(null); await load(); toast.success("Событие сохранено");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Не удалось добавить событие"); }
    finally { eventLock.current = false; setSavingEvent(false); }
  };
  const openEvent = (item?: EventItem, date = today) => { setEditingEvent(item ?? null); setEventDate(item?.eventDate ?? date); setSelectedDay(null); setEventOpen(true); };
  const eventActions = (item: EventItem) => <div className="event-actions"><Button variant="outline" onClick={() => openEvent(item)}>Изменить</Button></div>;

  const shellStyle = pair.backgroundKey ? ({ "--couple-bg": `url('${pair.backgroundUrl}')` } as CSSProperties) : undefined;
  return (
    <main className={`couple-shell ${pair.backgroundKey ? "has-photo-bg" : ""}`} data-theme={pair.theme} style={shellStyle}>
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="topbar">
        <div><p className="eyebrow">{partner ? `вы и ${partnerAlias || partner.displayName}` : "ваше пространство"}</p><h1>{pair.name}</h1></div>
        <div className="top-actions">
          {pending.length > 0 && <button className="round-button mail-alert" onClick={() => setActiveLetter(pending[0])} aria-label="Открыть приглашение"><Mail /></button>}
          <button className="round-button" onClick={() => setNotificationOpen(true)} aria-label="Включить уведомления"><Bell /></button>
          <button className="profile-button" onClick={() => setProfileOpen(true)} aria-label="Открыть профиль">{me?.avatarKey ? <img src={me.avatarUrl || ""} alt="Моя фотография" /> : <User />}</button>
        </div>
      </header>

      {pendingPartner && <section className="partner-request"><div><span><Heart fill="currentColor" /></span><p><strong>{pendingPartner.displayName}</strong> хочет стать вашим партнёром</p></div><Button onClick={() => run("confirmPartner", { userId: pendingPartner.userId })}>Подтвердить</Button></section>}

      <Tabs defaultValue="calendar" className="app-tabs">
        <TabsList className="bottom-nav">
          <TabsTrigger value="calendar"><CalendarDays /><span>Календарь</span></TabsTrigger>
          <TabsTrigger value="chat"><MessageCircle /><span>Чат</span></TabsTrigger>
          <TabsTrigger value="wishes"><Gift /><span>Мечты</span></TabsTrigger>
          <TabsTrigger value="more"><Heart /><span>Для меня</span></TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="tab-page">
          <section className="hero-card">
            <div><p>Ближайшее</p><h2>{upcoming[0]?.title ?? "Запланируйте ваш день"}</h2>{upcoming[0] && <span>{prettyDate(upcoming[0].eventDate)} {upcoming[0].eventTime && `в ${upcoming[0].eventTime}`}</span>}</div>
            <Button className="primary-add" onClick={() => openEvent()}><Plus /> Добавить</Button>
          </section>
          <section className="calendar-card">
            <div className="month-title"><button onClick={() => setMonth(subMonths(month, 1))}><ChevronLeft /></button><h2>{format(month, "LLLL yyyy", { locale: ru })}</h2><button onClick={() => setMonth(addMonths(month, 1))}><ChevronRight /></button></div>
            <MonthGrid month={month} events={events} onDay={setSelectedDay} /><p className="calendar-hint">Нажмите на любой день: посмотреть события или добавить запись.</p>
          </section>
          <section className="section-block"><div className="section-heading"><div><p className="eyebrow">в планах</p><h2>Ближайшие события</h2></div></div>
            <div className="event-list">{upcoming.length ? upcoming.map(item => <div key={item.id}><EventCard item={item} />{eventActions(item)}</div>) : <Empty icon={<CalendarDays />} text="Добавьте первое совместное событие" />}</div>
          </section>
        </TabsContent>

        <TabsContent value="chat" className="tab-page chat-page">
          <div className="chat-switch"><button className={!secretOpen ? "active" : ""} onClick={() => setSecretOpen(false)}><MessageCircle /> Обычный чат</button><button className={secretOpen ? "active secret" : "secret"} onClick={() => setSecretOpen(true)}><Lock /> Секретная комната</button></div>
          {secretOpen ? <SecretRoom pairId={pair.id} messages={data.secretMessages ?? []} userId={data.user.id} onRefresh={load} /> : <section className="normal-room"><div className="section-heading chat-heading"><div><p className="eyebrow">только между вами</p><h2>{partnerAlias || partner?.displayName || "Ваш чат"}</h2></div></div>
          <div className="messages" role="log" aria-label="Сообщения">{(data.messages ?? []).length ? data.messages!.map(message => <div key={message.id} className={`message ${message.authorUserId === data.user.id ? "mine" : "theirs"}`}><span>{message.authorName}</span>{message.photoKey && <a href={message.photoUrl || "#"} target="_blank" rel="noreferrer"><img className="chat-photo" src={message.photoUrl || ""} alt="Фотография в переписке" /></a>}{message.content && <p>{message.content}</p>}<div className="message-footer"><time>{format(new Date(message.createdAt), "HH:mm")}</time>{message.authorUserId === data.user.id && <button type="button" className="delete-message" onClick={() => setDeleteMessageTarget(message)} aria-label="Удалить своё сообщение">Удалить</button>}</div></div>) : <Empty icon={<MessageCircle />} text="Здесь появятся ваши сообщения" />}<div ref={messagesEnd} /></div>
          <div className="chat-composer">{chatPreview && <div className="chat-attachment"><img src={chatPreview} alt="Фото перед отправкой"/><Button variant="outline" disabled={sendingMessage} onClick={()=>setChatFile(undefined)}>Убрать фото</Button></div>}
          {emojiOpen && <div className="emoji-picker" aria-label="Смайлики">{["❤️","🥰","😘","😂","😊","😍","🥺","🤗","🔥","💕","👍","🎉","🐰","🐱","🌷","✨"].map(emoji=><button type="button" key={emoji} aria-label={emoji} disabled={sendingMessage} onClick={()=>{const input=messageRef.current;if(!input)return;const start=input.selectionStart??input.value.length;const end=input.selectionEnd??start;input.value=(input.value.slice(0,start)+emoji+input.value.slice(end)).slice(0,1000);input.focus();input.setSelectionRange(start+emoji.length,start+emoji.length);}}>{emoji}</button>)}</div>}
          <form className="message-form" onSubmit={async e => { e.preventDefault(); if(chatLock.current || preparingChat)return;const content=messageRef.current?.value.trim()??"";if(!content&&!chatFile)return;chatLock.current=true;setSendingMessage(true);try{if(chatFile)await uploadPhoto(chatFile,"message","",content);else await api("addMessage",{content});if(messageRef.current)messageRef.current.value="";setChatFile(undefined);setEmojiOpen(false);await load();messagesEnd.current?.scrollIntoView({block:"nearest"});}catch(err){toast.error(err instanceof Error?err.message:"Не удалось отправить. Попробуйте ещё раз.");}finally{chatLock.current=false;setSendingMessage(false);} }}>
          <label className="chat-file-button" aria-label="Прикрепить фотографию"><Camera/><input type="file" accept="image/*" disabled={sendingMessage || preparingChat} onChange={async e=>{const picked=e.target.files?.[0];e.target.value="";if(!picked)return;setPreparingChat(true);try{setChatFile(await preparePhoto(picked,"message"));}catch(err){toast.error(err instanceof Error?err.message:"Не удалось открыть фото");}finally{setPreparingChat(false);}}}/></label>
          <button type="button" className="emoji-toggle" aria-label="Смайлики" aria-expanded={emojiOpen} onClick={()=>setEmojiOpen(!emojiOpen)}>😊</button><Input ref={messageRef} disabled={sendingMessage} placeholder="Написать сообщение…" maxLength={1000}/><Button type="submit" size="icon" disabled={sendingMessage || preparingChat} aria-label="Отправить"><Send/></Button></form><p className="photo-hint">{preparingChat ? "Подготавливаем фотографию…" : "Фото до 20 МБ · уменьшаем автоматически"}</p></div></section>}

        </TabsContent>

        <TabsContent value="wishes" className="tab-page">
          <div className="section-heading"><div><p className="eyebrow">подсказки для подарков</p><h2>Мечты и желания</h2></div><Dialog open={wishOpen} onOpenChange={setWishOpen}><DialogTrigger asChild><Button size="icon" className="round-add"><Plus /></Button></DialogTrigger><WishDialog onSave={async(p,file)=>{const result=await api("addWish",p);if(file){try{await uploadPhoto(file,"wish",String(result.id));}catch(e){toast.error("Желание сохранено. Фото можно добавить кнопкой на его карточке.");}}setWishOpen(false);await load();}} /></Dialog></div>
          <div className="wish-grid">{(data.wishes ?? []).length ? data.wishes!.map(w => <article key={w.id} className={`wish-card ${w.fulfilled ? "fulfilled" : ""}`}>{w.photoKey ? <img className="wish-photo" src={w.photoUrl || ""} alt="Желание" /> : <div className="wish-icon"><Gift /></div>}<div className="wish-copy"><span>{w.authorUserId === data.user.id ? "Я хочу" : `${w.authorName} хочет`} · {w.priority === "dream" ? "мечта" : w.priority === "want" ? "очень хочется" : "было бы приятно"}</span><h3>{w.title}</h3>{w.price && <b className="wish-price">{w.price}</b>}{w.details && <p>{w.details}</p>}{w.link && <a href={safeLink(w.link)} target="_blank" rel="noreferrer">Посмотреть ссылку</a>}</div>{w.authorUserId !== data.user.id && !w.fulfilled && <button className="reserve-wish" onClick={() => run("reserveWish", { id: w.id })}>{w.reservedBy === data.user.id ? "✓ Вы готовите сюрприз" : "Тайно забронировать"}</button>}<button className="fulfill" onClick={() => run("fulfillWish", { id: w.id })}>{w.fulfilled ? <><Check /> Исполнено</> : "Отметить исполненным"}</button>{w.authorUserId===data.user.id&&<div className="wish-actions"><WishPhotoPicker label={w.photoKey?"Заменить фото":"Добавить фото"} disabled={wishBusy} onSave={async file=>{setWishBusy(true);try{await uploadPhoto(file,"wish",w.id);await load();toast.success("Фото добавлено");}finally{setWishBusy(false);}}}/><Button variant="outline" onClick={()=>setDeleteWish(w)}>Удалить</Button><small>{WISH_PHOTO_HINT}</small></div>}</article>) : <Empty icon={<Gift />} text="Добавьте желания — так выбирать подарки станет проще" />}</div>
        </TabsContent>

        <TabsContent value="more" className="tab-page">
          <section className="feature-banner"><div><p className="eyebrow">особенный вечер</p><h2>Пригласить на свидание</h2><p>Напишите письмо, которое откроется как маленький сюрприз.</p></div><Dialog open={inviteOpen} onOpenChange={setInviteOpen}><DialogTrigger asChild><Button><Mail /> Создать письмо</Button></DialogTrigger><InviteDialog onSave={p => run("addInvitation", p, () => setInviteOpen(false))} /></Dialog></section>
          <section className="section-block"><div className="section-heading"><div><p className="eyebrow">сохранить важное</p><h2>Наши заметки</h2></div><Dialog open={noteOpen} onOpenChange={setNoteOpen}><DialogTrigger asChild><Button size="icon" className="round-add"><Plus /></Button></DialogTrigger><NoteDialog onSave={p => run("addNote", p, () => setNoteOpen(false))} /></Dialog></div><div className="note-grid">{(data.notes ?? []).length ? data.notes!.map(n => <article className="note-card" key={n.id}><NotebookPen /><h3>{n.title}</h3><p>{n.content}</p></article>) : <Empty icon={<NotebookPen />} text="Списки, планы и мысли будут храниться здесь" />}</div></section>
          <section className="settings-card"><div><Palette /><span><strong>Оформление пространства</strong><small>Общее для двоих: тема и фон меняются у обоих партнёров</small></span></div><div className="theme-row">{themes.map(t => <button key={t.id} className={pair.theme === t.id ? "selected" : ""} onClick={() => run("updateTheme", { theme: t.id })} aria-label={t.name} title={t.name} style={{ background: `linear-gradient(135deg, ${t.colors})` }}>{pair.theme === t.id && <Check />}</button>)}</div><label className="background-upload"><Camera /> {uploadingBackground ? "Подготавливаем и загружаем…" : "Выбрать фотографию на фон"}<input type="file" accept="image/*" disabled={uploadingBackground} onChange={async e => { const file=e.target.files?.[0]; e.target.value=""; if(!file)return; setUploadingBackground(true); try{await uploadPhoto(file,"background");await load();toast.success("Фон календаря обновлён");}catch(err){toast.error(err instanceof Error?err.message:"Не удалось загрузить фон");}finally{setUploadingBackground(false);} }} /></label><p className="photo-hint">{PHOTO_HINT}</p>{pair.backgroundKey && <img className="background-preview" src={pair.backgroundUrl || ""} alt="Текущий фон календаря" />}</section>
          {partner && <section className="settings-card partner-settings"><div><Heart /><span><strong>{partnerAlias || partner.displayName}</strong><small>{partner.bio || "Ваш партнёр"}</small></span></div><form onSubmit={e => { e.preventDefault(); const f=new FormData(e.currentTarget); run("setAlias",{targetUserId:partner.userId,alias:f.get("alias")}); }}><Input name="alias" defaultValue={partnerAlias} placeholder="Ваше прозвище для партнёра" /><Button type="submit">Сохранить</Button></form></section>}
          <section className="settings-card"><Button variant="outline" onClick={()=>setNotificationOpen(true)}><Bell/>Мои уведомления</Button><p className="photo-hint">Разрешение, типы уведомлений и проверка доставки на это устройство.</p></section><section className="settings-card help-card"><button onClick={() => setHelpOpen(true)}><HelpCircle /><span><strong>Как пользоваться</strong><small>Код пары, фото, письма и другие функции</small></span><ChevronRight /></button><div className="pair-code"><span>Код для партнёра</span><button onClick={() => { navigator.clipboard.writeText(pair.inviteCode); toast.success("Код скопирован"); }}>{pair.inviteCode}<Copy /></button></div></section>
        </TabsContent>
      </Tabs>
      <Dialog open={notificationOpen} onOpenChange={setNotificationOpen}><NotificationSettings/></Dialog>
      <Dialog open={!!deleteWish} onOpenChange={open=>!open&&setDeleteWish(null)}><DialogContent className="form-dialog"><DialogHeader><DialogTitle>Удалить желание?</DialogTitle><DialogDescription>«{deleteWish?.title}» исчезнет из списка.</DialogDescription></DialogHeader><Button disabled={wishBusy} onClick={async()=>{if(!deleteWish)return;setWishBusy(true);try{await api("deleteWish",{id:deleteWish.id});setDeleteWish(null);await load();}catch(err){toast.error(err instanceof Error?err.message:"Не удалось удалить");}finally{setWishBusy(false);}}}>Удалить</Button><Button variant="outline" onClick={()=>setDeleteWish(null)}>Оставить</Button></DialogContent></Dialog>
      <Dialog open={eventOpen} onOpenChange={open => { if (!savingEvent) setEventOpen(open); }}><EventDialog key={editingEvent?.id ?? eventDate} item={editingEvent} date={eventDate} busy={savingEvent || deletingEvent} onSubmit={submitEvent} onDelete={() => editingEvent && setDeleteTarget(editingEvent)} /></Dialog>
      <Dialog open={!!selectedDay} onOpenChange={open => !open && setSelectedDay(null)}><DialogContent className="form-dialog day-dialog"><DialogHeader><DialogTitle>{selectedDay ? prettyDate(selectedDay) : "События дня"}</DialogTitle><DialogDescription>Все события выбранного дня. Изменения видны вам обоим.</DialogDescription></DialogHeader><Button onClick={() => openEvent(undefined, selectedDay!)}><Plus />Добавить запись</Button>{events.filter(item => item.eventDate === selectedDay).map(item => <div key={item.id}><EventCard item={item} />{eventActions(item)}</div>)}{!events.some(item => item.eventDate === selectedDay) && <p>На этот день пока ничего не запланировано.</p>}</DialogContent></Dialog>
      <Dialog open={!!deleteMessageTarget} onOpenChange={open => !open && !deletingMessage && setDeleteMessageTarget(null)}><DialogContent className="form-dialog"><DialogHeader><DialogTitle>Удалить сообщение?</DialogTitle><DialogDescription>Ваше сообщение и прикреплённая к нему фотография исчезнут из переписки у вас обоих.</DialogDescription></DialogHeader><Button disabled={deletingMessage} onClick={async () => {if(!deleteMessageTarget || deletingMessage)return;setDeletingMessage(true);try{await api("deleteMessage",{id:deleteMessageTarget.id});setDeleteMessageTarget(null);await load();toast.success("Сообщение удалено");}catch(err){toast.error(err instanceof Error?err.message:"Не удалось удалить сообщение");}finally{setDeletingMessage(false);}}}>{deletingMessage?"Удаляем…":"Удалить у обоих"}</Button><Button variant="outline" disabled={deletingMessage} onClick={() => setDeleteMessageTarget(null)}>Оставить</Button></DialogContent></Dialog>
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && !deletingEvent && setDeleteTarget(null)}><DialogContent className="form-dialog"><DialogHeader><DialogTitle>Удалить событие?</DialogTitle><DialogDescription>«{deleteTarget?.title}» будет удалено у обоих партнёров.</DialogDescription></DialogHeader><Button disabled={deletingEvent} onClick={async () => { if (!deleteTarget) return; setDeletingEvent(true); try { await api("deleteEvent", {id:deleteTarget.id}); setDeleteTarget(null); setEventOpen(false); setEditingEvent(null); await load(); toast.success("Событие удалено"); } catch(err) { toast.error(err instanceof Error ? err.message : "Не удалось удалить"); } finally { setDeletingEvent(false); } }}>{deletingEvent ? "Удаляем…" : "Удалить событие"}</Button><Button variant="outline" disabled={deletingEvent} onClick={() => setDeleteTarget(null)}>Оставить</Button></DialogContent></Dialog>
      <Dialog open={!!activeLetter} onOpenChange={open => !open && setActiveLetter(null)}>{activeLetter && <Letter invitation={activeLetter} own={activeLetter.authorUserId === data.user.id} onRespond={status => run("respondInvitation", { id: activeLetter.id, status }, () => setActiveLetter(null))} />}</Dialog>
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}><ProfileDialog me={me} pair={pair} onSave={async (values,file) => { await api("updateProfile",values); if(file) await uploadPhoto(file,"avatar"); setProfileOpen(false); await load(); toast.success("Профиль обновлён"); }} /></Dialog>
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}><HelpDialog code={pair.inviteCode} /></Dialog>
      <Toaster position="top-center" richColors />
    </main>
  );
}

function Onboarding({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const submit = async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); try { const profile={displayName:f.get("displayName"),bio:f.get("bio"),birthDate:f.get("birthDate")}; if (mode === "create") await api("createPair", { ...profile, name: f.get("name"), theme: "rose" }); else await api("joinPair", { ...profile, inviteCode: f.get("code") }); await onDone(); } catch (error) { toast.error(error instanceof Error ? error.message : "Не получилось"); } };
  return <main className="onboarding"><div className="onboarding-card"><div className="between-mark"><Heart fill="currentColor" /><Heart fill="currentColor" /></div><p className="eyebrow">личное пространство для двоих</p><h1>Между нами</h1><p>Календарь, воспоминания, мечты и разговоры — только для вашей пары.</p>{mode === "choose" ? <div className="onboarding-actions"><Button onClick={() => setMode("create")}><Sparkles /> Создать свою пару</Button><Button variant="outline" onClick={() => setMode("join")}>У меня есть код</Button></div> : <form onSubmit={submit}><Input name="displayName" placeholder="Как вас зовут?" required /><Input name="birthDate" type="date" aria-label="Дата рождения" /><Input name="bio" placeholder="Короткая подпись о себе" />{mode === "create" ? <Input name="name" placeholder="Название пары, например «Наш мир»" required /> : <Input name="code" placeholder="Код партнёра из 6 символов" required />}<Button type="submit">{mode === "create" ? "Создать пространство" : "Отправить запрос"}</Button><button type="button" className="text-button" onClick={() => setMode("choose")}>Назад</button></form>}<LogoutLink /></div><Toaster position="top-center" richColors /></main>;
}

function MonthGrid({ month, events, onDay }: { month: Date; events: EventItem[]; onDay: (date: string) => void }) {
  const days = getDaysInMonth(month); const start = (getDay(month) + 6) % 7; const cells = Array(start).fill(null).concat(Array.from({ length: days }, (_, i) => i + 1)); const monthKey = format(month, "yyyy-MM");
  return <><div className="weekdays">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(d => <span key={d}>{d}</span>)}</div><div className="month-grid">{cells.map((day, i) => { if (!day) return <span key={`blank-${i}`} />; const key = `${monthKey}-${String(day).padStart(2, "0")}`; const matches = events.filter(e => e.eventDate === key && !e.cancelled); const isToday = key === format(new Date(), "yyyy-MM-dd"); return <button key={key} className={isToday ? "today" : ""} aria-label={`${prettyDate(key)}: событий ${matches.length}`} onClick={() => onDay(key)}><b>{day}</b><span className="day-markers">{matches.slice(0, 3).map(e => <i key={e.id} style={{color:e.color}}>{markerSymbol(e.marker)}</i>)}</span></button>; })}</div></>;
}

function EventCard({ item }: { item: EventItem }) { const calendar = eventCalendarHref(item); return <article className="event-card">{item.photoKey ? <img src={item.photoUrl || ""} alt="Воспоминание о событии" /> : <div className="event-date"><strong>{format(parseISO(item.eventDate), "dd")}</strong><span>{format(parseISO(item.eventDate), "MMM", { locale: ru })}</span></div>}<div><span>{prettyDate(item.eventDate)} {item.eventTime && `· ${item.eventTime}`}</span><h3>{item.cancelled && "Отменено · "}{item.title}</h3>{item.description && <p>{item.description}</p>}{!item.cancelled && <a href={calendar} download={`${item.title || "event"}.ics`}>Добавить в календарь</a>}</div></article>; }

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="empty-state">{icon}<p>{text}</p></div>; }

function EventDialog({ onSubmit, item, date, busy, onDelete }: { onSubmit: (e: FormEvent<HTMLFormElement>) => void; item: EventItem | null; date: string; busy: boolean; onDelete: () => void }) { return <DialogContent className="form-dialog"><DialogHeader><DialogTitle>{item ? "Изменить событие" : "Новое событие"}</DialogTitle><DialogDescription>Здесь можно поменять дату, время, название и место или удалить событие.</DialogDescription></DialogHeader><form onSubmit={onSubmit}><label>Название<Input name="title" defaultValue={item?.title} placeholder="Ужин, прогулка, важное дело…" required /></label><div className="form-row"><label>Дата<Input type="date" name="eventDate" defaultValue={date} required /></label><label>Время<Input type="time" name="eventTime" defaultValue={item?.eventTime} /></label></div><div className="form-row"><label>Категория<NativeSelect name="category" defaultValue={item?.category ?? "date"}><NativeSelectOption value="date">❤️ Свидание</NativeSelectOption><NativeSelectOption value="birthday">🎂 День рождения</NativeSelectOption><NativeSelectOption value="anniversary">💍 Годовщина</NativeSelectOption><NativeSelectOption value="important">⭐ Важный день</NativeSelectOption><NativeSelectOption value="trip">◆ Поездка</NativeSelectOption><NativeSelectOption value="general">● Обычное дело</NativeSelectOption></NativeSelect></label><label>Цвет<Input type="color" name="color" defaultValue={item?.color ?? "#E75078"} /></label></div><input type="hidden" name="marker" value="heart" /><label>Место и описание<Textarea name="description" defaultValue={item?.description} placeholder="Место, детали или маленькое напоминание" /></label><label className="file-label"><Camera /> Добавить фотографию<Input type="file" name="photo" accept="image/*" /></label><p className="photo-hint">{PHOTO_HINT}</p><p className="photo-hint">«Добавить в календарь» переносит запись в календарь телефона. Изменения здесь не синхронизируются автоматически.</p><Button type="submit" disabled={busy}>{busy ? "Сохраняем…" : "Сохранить событие"}</Button></form>{item && <Button type="button" variant="outline" disabled={busy} onClick={onDelete}>Удалить событие</Button>}</DialogContent>; }
function NoteDialog({ onSave }: { onSave: (p: Record<string, unknown>) => void }) { return <DialogContent className="form-dialog"><DialogHeader><DialogTitle>Новая заметка</DialogTitle><DialogDescription>Список, мысль или важная информация для вас двоих.</DialogDescription></DialogHeader><SimpleForm fields={[['title','Заголовок','Например, покупки в дом'],['content','Текст заметки','Напишите здесь…','textarea']]} submit="Сохранить заметку" onSave={onSave} /></DialogContent>; }
function WishDialog({ onSave }: { onSave: (p: Record<string, unknown>, file?: File) => Promise<void> }) { const [busy,setBusy]=useState(false);const [file,setFile]=useState<File>();const [cropPending,setCropPending]=useState(false);const [error,setError]=useState(""); const [preview,setPreview]=useState("");useEffect(()=>{if(!file){setPreview("");return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]); return <DialogContent className="form-dialog"><DialogHeader><DialogTitle>Новая мечта</DialogTitle><DialogDescription>Подскажите партнёру, что действительно вас порадует.</DialogDescription></DialogHeader><form onSubmit={async e=>{e.preventDefault();if(busy || cropPending)return;const f=new FormData(e.currentTarget);setBusy(true);setError("");try{await onSave(Object.fromEntries(f),file);}catch(err){setError(err instanceof Error?err.message:"Не удалось сохранить");}finally{setBusy(false);}}}><label>Что хочется<Input name="title" placeholder="Книга, украшение или поездка…" required /></label><div className="form-row"><label>Примерная цена<Input name="price" placeholder="Например, 3 000 ₽" /></label><label>Насколько хочется<NativeSelect name="priority" defaultValue="nice"><NativeSelectOption value="nice">Было бы приятно</NativeSelectOption><NativeSelectOption value="want">Очень хочется</NativeSelectOption><NativeSelectOption value="dream">Это мечта</NativeSelectOption></NativeSelect></label></div><label>Подробности<Textarea name="details" placeholder="Размер, цвет или важные детали" /></label><label>Ссылка<Input name="link" placeholder="Можно оставить пустой" /></label><WishPhotoPicker label={file?"Выбрать другое фото":"Добавить фото"} disabled={busy} onPendingChange={setCropPending} onSave={setFile}/><p className="photo-hint">{WISH_PHOTO_HINT}</p>{preview&&!cropPending&&<img className="wish-square-preview" src={preview} alt="Фото желания"/>}{error&&<p role="alert" className="upload-error">{error}</p>}<Button type="submit" disabled={busy || cropPending}>{busy?"Подождите…":cropPending?"Сначала выберите фрагмент":"Добавить желание"}</Button></form></DialogContent>; }
function InviteDialog({ onSave }: { onSave: (p: Record<string, unknown>) => void }) { return <DialogContent className="form-dialog"><DialogHeader><DialogTitle>Приглашение на свидание</DialogTitle><DialogDescription>Партнёр получит красивое письмо и сможет ответить.</DialogDescription></DialogHeader><form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); onSave(Object.fromEntries(f)); }}><label>Заголовок<Input name="title" defaultValue="Приглашение на свидание" /></label><label>Текст письма<Textarea name="letter" defaultValue="Приглашаю тебя провести этот вечер вместе. Обещаю уют, хорошее настроение и маленький сюрприз…" required /></label><div className="form-row"><label>Дата<Input type="date" name="eventDate" required /></label><label>Время<Input type="time" name="eventTime" /></label></div><label>Место<Input name="place" placeholder="Оставьте тайной или напишите адрес" /></label><Button type="submit"><Mail /> Запечатать письмо</Button></form></DialogContent>; }

function SimpleForm({ fields, submit, onSave }: { fields: string[][]; submit: string; onSave: (p: Record<string, unknown>) => void }) { return <form onSubmit={e => { e.preventDefault(); onSave(Object.fromEntries(new FormData(e.currentTarget))); }}>{fields.map(([name,label,placeholder,type]) => <label key={name}>{label}{type === 'textarea' ? <Textarea name={name} placeholder={placeholder} /> : <Input name={name} placeholder={placeholder} required={name === 'title'} />}</label>)}<Button type="submit">{submit}</Button></form>; }

function Letter({ invitation, own, onRespond }: { invitation: Invitation; own: boolean; onRespond: (s: string) => void }) { return <DialogContent className="letter-dialog"><div className="letter-glow" /><div className="wax-seal"><Heart fill="currentColor" /></div><p className="letter-kicker">лично для тебя</p><DialogTitle>{invitation.title}</DialogTitle><div className="ornament">❦</div><p className="letter-text">{invitation.letter}</p><div className="letter-details"><span>{prettyDate(invitation.eventDate)}</span>{invitation.eventTime && <span>в {invitation.eventTime}</span>}{invitation.place && <span>{invitation.place}</span>}</div><p className="letter-sign">С нежностью, {invitation.authorName}</p>{own ? <p className="letter-wait">Ждём ответа партнёра…</p> : <div className="letter-actions"><Button onClick={() => onRespond("accepted")}><Check /> Принять</Button><Button variant="outline" onClick={() => onRespond("declined")}><X /> Отклонить</Button></div>}</DialogContent>; }

function WaitingRoom({ pair }: { pair: Pair }) { return <main className="onboarding"><div className="onboarding-card"><div className="logo-heart"><Heart fill="currentColor" /></div><p className="eyebrow">запрос отправлен</p><h1>Почти вместе</h1><p>Создатель пространства «{pair.name}» должен подтвердить, что вы его партнёр. После подтверждения приложение откроется автоматически.</p><Button onClick={() => location.reload()}>Проверить ещё раз</Button><LogoutLink /></div></main>; }

function ProfileDialog({ me, onSave }: { me: Member; pair: Pair; onSave: (values: Record<string, unknown>, file?: File) => Promise<void> }) {
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (!file) { setPreview(""); return; } const url=URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  return <DialogContent className="form-dialog"><DialogHeader><DialogTitle>Мой профиль</DialogTitle><DialogDescription>Выберите фото, затем нажмите «Сохранить профиль».</DialogDescription></DialogHeader><form onSubmit={async e => { e.preventDefault(); if (busy || preparing) return; const f=new FormData(e.currentTarget); setBusy(true); setError(""); try { await onSave({displayName:f.get("displayName"),bio:f.get("bio"),birthDate:f.get("birthDate")},file); } catch(err) { setError(err instanceof Error ? err.message : "Не удалось сохранить профиль"); } finally { setBusy(false); } }}>
  <div className="profile-preview">{preview || me.avatarKey ? <img src={preview || me.avatarUrl || ""} alt="Предпросмотр аватарки"/> : <User/>}<label><Camera/>{preparing ? "Подготавливаем фото…" : "Изменить фото"}<Input type="file" accept="image/*" disabled={busy || preparing} onChange={async e=>{const picked=e.target.files?.[0];e.target.value="";if(!picked)return;setPreparing(true);setError("");try{setFile(await preparePhoto(picked,"avatar"));}catch(err){setError(err instanceof Error?err.message:"Не удалось открыть фото");}finally{setPreparing(false);}}}/></label></div>
  <p className="photo-hint">{PHOTO_HINT}</p>{error && <p className="upload-error" role="alert">{error}</p>}
  <label>Имя<Input name="displayName" defaultValue={me.displayName} required /></label><label>Подпись<Input name="bio" defaultValue={me.bio} placeholder="Несколько слов о себе" /></label><label>Дата рождения<Input type="date" name="birthDate" defaultValue={me.birthDate} /></label><Button type="submit" disabled={busy || preparing}>{busy ? "Сохраняем…" : "Сохранить профиль"}</Button></form><LogoutLink /></DialogContent>;
}

function HelpDialog({ code }: { code: string }) { const steps=[{icon:<CalendarDays/>,title:"Управлять событиями",text:"Нажмите любой день и добавьте запись. Если событий несколько, выберите нужное. Нажмите «Изменить», чтобы поменять дату, время, название или место. В этом же окне есть «Удалить событие» с подтверждением. «Добавить в календарь» открывает файл для календаря телефона; это не автоматическая синхронизация."},{icon:<Heart/>,title:"Добавить партнёра",text:`Скопируйте код ${code} и отправьте его партнёру. Он входит в приложение, выбирает «У меня есть код» и отправляет запрос. Затем подтвердите его.`},{icon:<Camera/>,title:"Добавить фотографию",text:"Откройте создание события и нажмите «Добавить фотографию». Для аватарки откройте свой профиль, выберите фото и нажмите «Сохранить профиль». Для фона — «Для меня» → «Выбрать фотографию на фон». Принимаются фотографии до 20 МБ: перед отправкой они автоматически уменьшаются. Если HEIC не открывается, выберите JPEG."},{icon:<Mail/>,title:"Отправить красивое письмо",text:"В разделе «Для меня» нажмите «Создать письмо», выберите дату, время и место. Партнёр увидит конверт и сможет принять или отклонить приглашение."},{icon:<Gift/>,title:"Добавить желание",text:"Откройте «Мечты», нажмите плюс и укажите подарок, цену, ссылку и насколько сильно вы этого хотите. Партнёр может тайно забронировать желание."},{icon:<Lock/>,title:"Секретная комната",text:"В чате переключитесь на секретную комнату. Создатель комнаты отправляет партнёру защищённую ссылку с ключом, после чего оба задают PIN-код на своих телефонах."}];return <DialogContent className="help-dialog"><DialogHeader><DialogTitle>Как пользоваться</DialogTitle><DialogDescription>Подсказки для вашего пространства.</DialogDescription></DialogHeader><div className="help-steps">{steps.map((s,i)=><article key={s.title}><span>{s.icon}</span><div><small>Шаг {i+1}</small><h3>{s.title}</h3><p>{s.text}</p></div></article>)}</div></DialogContent>; }

function SecretRoom({ pairId, messages, userId, onRefresh }: { pairId: string; messages: SecretMessage[]; userId: string; onRefresh: () => Promise<void> }) {
  const storageKey=`between-secret-${pairId}`; const pinKey=`between-pin-${pairId}`;
  const [key,setKey]=useState(""); const [share,setShare]=useState(""); const [pinHash,setPinHash]=useState(""); const [unlocked,setUnlocked]=useState(false); const [text,setText]=useState(""); const [timer,setTimer]=useState("never");
  useEffect(()=>{let saved=localStorage.getItem(storageKey)||"";const fragment=new URLSearchParams(location.hash.slice(1)).get("secret");if(fragment&&fragment.length>30){saved=fragment;localStorage.setItem(storageKey,fragment);history.replaceState(null,"",location.pathname+location.search);toast.success("Ключ секретной комнаты сохранён");}setKey(saved);const p=localStorage.getItem(pinKey)||"";setPinHash(p);setUnlocked(!p);},[pairId]);
  const createRoom=()=>{const raw=crypto.getRandomValues(new Uint8Array(32));const value=toBase64(raw);localStorage.setItem(storageKey,value);setKey(value);const link=`${location.origin}${appPath("/")}#secret=${value}`;setShare(link);navigator.clipboard.writeText(link);toast.success("Защищённая ссылка скопирована");};
  const send=async()=>{if(!text.trim()||!key)return;try{const encrypted=await encryptSecret(new TextEncoder().encode(text.trim()),key);await api("addSecretMessage",{cipherText:encrypted.data,iv:encrypted.iv,kind:"text",expiresAt:expiryValue(timer)});setText("");await onRefresh();}catch{toast.error("Не удалось зашифровать сообщение");}};
  const sendPhoto=async(file:File)=>{if(!key)return;try{const prepared=await preparePhoto(file,"message");const encrypted=await encryptSecret(new Uint8Array(await prepared.arrayBuffer()),key);const mediaKey=await uploadSecretBlob(new Blob([fromBase64(encrypted.data)],{type:"application/octet-stream"}));await api("addSecretMessage",{cipherText:"encrypted-photo",iv:encrypted.iv,kind:`photo:${prepared.type}`,mediaKey,expiresAt:expiryValue(timer)});await onRefresh();toast.success("Фото отправлено защищённо");}catch{toast.error("Не удалось отправить фотографию");}};
  if(!key)return <div className="secret-setup"><ShieldCheck/><h2>Создать секретную комнату</h2><p>Сообщения и фотографии будут зашифрованы на вашем телефоне. Сервер хранит только нечитаемый набор символов.</p><Button onClick={createRoom}><KeyRound/>Создать ключ комнаты</Button>{share&&<div className="secret-link"><Input readOnly value={share}/><Button size="icon" onClick={()=>navigator.clipboard.writeText(share)}><Copy/></Button><small>Отправьте эту ссылку партнёру лично. Сам ключ находится после символа # и не передаётся серверу.</small></div>}</div>;
  if(pinHash&&!unlocked)return <form className="secret-lock" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);if(await hashText(String(f.get("pin")))===pinHash)setUnlocked(true);else toast.error("Неверный PIN-код");}}><Lock/><h2>Секретная комната закрыта</h2><Input name="pin" type="password" inputMode="numeric" placeholder="Введите PIN-код" required/><Button type="submit">Открыть</Button></form>;
  return <div className="secret-room"><div className="secret-header"><div><p className="eyebrow">сквозное шифрование</p><h2>Секретная комната</h2></div><div>{!pinHash?<form onSubmit={async e=>{e.preventDefault();const v=String(new FormData(e.currentTarget).get("pin"));if(v.length<4){toast.error("Минимум 4 цифры");return;}const h=await hashText(v);localStorage.setItem(pinKey,h);setPinHash(h);toast.success("PIN установлен");}} className="pin-setup"><Input name="pin" type="password" inputMode="numeric" placeholder="Новый PIN"/><Button type="submit">Защитить</Button></form>:<Button variant="outline" size="icon" onClick={()=>setUnlocked(false)} aria-label="Закрыть"><Lock/></Button>}</div></div><div className="secret-messages">{messages.length?messages.map(m=><SecretBubble key={m.id} message={m} roomKey={key} mine={m.authorUserId===userId} onDelete={async()=>{await api("deleteSecretMessage",{id:m.id});await onRefresh();}} onViewed={async()=>{if(m.expiresAt==="after_view"&&m.authorUserId!==userId){await api("consumeSecretMessage",{id:m.id});}}}/>):<Empty icon={<Lock/>} text="Здесь появятся зашифрованные сообщения"/>}</div><div className="secret-compose"><div className="secret-options"><label><Timer/><NativeSelect value={timer} onChange={e=>setTimer(e.target.value)}><NativeSelectOption value="never">Не удалять</NativeSelectOption><NativeSelectOption value="view">После просмотра</NativeSelectOption><NativeSelectOption value="hour">Через 1 час</NativeSelectOption><NativeSelectOption value="day">Через 24 часа</NativeSelectOption><NativeSelectOption value="week">Через 7 дней</NativeSelectOption></NativeSelect></label><label className="secret-photo"><Camera/><input type="file" accept="image/*" onChange={e=>e.target.files?.[0]&&sendPhoto(e.target.files[0])}/></label></div><div><Input value={text} onChange={e=>setText(e.target.value)} placeholder="Секретное сообщение…" onKeyDown={e=>{if(e.key==="Enter")send();}}/><Button size="icon" onClick={send}><Send/></Button></div></div></div>;
}

function SecretBubble({message,roomKey,mine,onViewed,onDelete}:{message:SecretMessage;roomKey:string;mine:boolean;onViewed:()=>Promise<void>;onDelete:()=>Promise<void>}){const [confirm,setConfirm]=useState(false);const [deleting,setDeleting]=useState(false);const [content,setContent]=useState<string>("");useEffect(()=>{let url="";(async()=>{try{if(message.kind.startsWith("photo:")&&message.mediaKey){const bytes=new Uint8Array(await downloadSecretBlob(message.mediaKey));const clear=await decryptSecret(bytes,message.iv,roomKey);url=URL.createObjectURL(new Blob([clear],{type:message.kind.slice(6)}));setContent(url);}else{const clear=await decryptSecret(fromBase64(message.cipherText),message.iv,roomKey);setContent(new TextDecoder().decode(clear));}await onViewed();}catch{setContent("Не удалось расшифровать");}})();return()=>{if(url)URL.revokeObjectURL(url);};},[message.id,roomKey]);return <div className={`message secret-bubble ${mine?"mine":"theirs"}`}><span>{message.authorName}</span>{message.kind.startsWith("photo:")&&content.startsWith("blob:")?<img src={content} alt="Секретная фотография"/>:<p>{content||"Расшифровываем…"}</p>}<small>{message.expiresAt==="after_view"?"исчезнет после просмотра":message.expiresAt?`до ${format(new Date(message.expiresAt),"dd.MM HH:mm")}`:"без таймера"}</small>{mine&&<div className="message-footer"><button type="button" className="delete-message" onClick={()=>setConfirm(true)}>Удалить</button></div>}<Dialog open={confirm} onOpenChange={open=>!deleting&&setConfirm(open)}><DialogContent className="form-dialog"><DialogHeader><DialogTitle>Удалить секретное сообщение?</DialogTitle><DialogDescription>Сообщение и прикреплённое фото исчезнут из секретного чата у вас обоих.</DialogDescription></DialogHeader><Button disabled={deleting} onClick={async()=>{if(deleting)return;setDeleting(true);try{await onDelete();setConfirm(false);toast.success("Сообщение удалено");}catch(err){toast.error(err instanceof Error?err.message:"Не удалось удалить");}finally{setDeleting(false);}}}>{deleting?"Удаляем…":"Удалить у обоих"}</Button><Button variant="outline" disabled={deleting} onClick={()=>setConfirm(false)}>Оставить</Button></DialogContent></Dialog></div>}

function LogoutLink(){return <button type="button" className="logout-link" onClick={async()=>{await signOut();location.href=appPath("/login/");}}>Выйти из аккаунта</button>}

function eventCalendarHref(item:EventItem){
  const esc=(v:string)=>(v||"").replaceAll("\\","\\\\").replaceAll("\n","\\n").replaceAll(",","\\,").replaceAll(";","\\;");
  const date=item.eventDate.replaceAll("-","");
  const timed=Boolean(item.eventTime);
  const start=timed?`${date}T${item.eventTime.replace(":","")}00`:`${date}`;
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Mezhdu Nami//RU","BEGIN:VEVENT",`UID:${item.id}@mezhdu-nami`,timed?`DTSTART:${start}`:`DTSTART;VALUE=DATE:${start}`,`SUMMARY:${esc(item.title)}`,item.description?`DESCRIPTION:${esc(item.description)}`:"","END:VEVENT","END:VCALENDAR"].filter(Boolean).join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines)}`;
}

function expiryValue(timer:string){const amounts:Record<string,number>={hour:3600000,day:86400000,week:604800000};if(timer==="view")return "after_view";return amounts[timer]?new Date(Date.now()+amounts[timer]).toISOString():"";}
function toBase64(bytes:Uint8Array){return btoa(String.fromCharCode(...bytes)).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");}
function fromBase64(value:string){const normalized=value.replaceAll("-","+").replaceAll("_","/");const raw=atob(normalized+"=".repeat((4-normalized.length%4)%4));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
async function importSecretKey(value:string){return crypto.subtle.importKey("raw",fromBase64(value),"AES-GCM",false,["encrypt","decrypt"]);}
async function encryptSecret(bytes:Uint8Array,key:string){const iv=crypto.getRandomValues(new Uint8Array(12));const result=await crypto.subtle.encrypt({name:"AES-GCM",iv},await importSecretKey(key),bytes);return{data:toBase64(new Uint8Array(result)),iv:toBase64(iv)};}
async function decryptSecret(bytes:Uint8Array,iv:string,key:string){const result=await crypto.subtle.decrypt({name:"AES-GCM",iv:fromBase64(iv)},await importSecretKey(key),bytes);return new Uint8Array(result);}
async function hashText(value:string){const result=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return toBase64(new Uint8Array(result));}
function markerSymbol(marker:string){return marker==="heart"?"♥":marker==="cake"?"●":marker==="ring"?"◇":marker==="star"?"★":marker==="diamond"?"◆":"●";}

function prettyDate(value: string) { try { return format(parseISO(value), "d MMMM", { locale: ru }); } catch { return value; } }
function safeLink(value: string) { return /^https?:\/\//i.test(value) ? value : `https://${value}`; }
