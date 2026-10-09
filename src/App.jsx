import React, { useState, useMemo } from "react";
import {
  Home, Users, Calendar, MessageSquare, MoreHorizontal, Shield,
  ClipboardList, TrendingUp, LogOut, Send, Check, X, Plus,
  ChevronLeft, ChevronRight, Search, User, Dumbbell, Utensils,
  Brain, HeartPulse, Footprints, AlertCircle, ArrowLeft, Trash2,
  UserCheck, UserX, ChevronRight as ChevronRightIcon, Eye, Layers
} from "lucide-react";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const ROLE_LABEL = {
  coordinator: "Coördinator",
  trainer: "Trainer",
  begeleider: "Begeleider",
  specialist: "Specialist",
  speler: "Speler",
};

const SCHEMA_TYPE_ICON = {
  voeding: Utensils,
  kracht: Dumbbell,
  loop: Footprints,
  herstel: HeartPulse,
  mentaal: Brain,
  anders: ClipboardList,
};

const SCHEMA_TYPE_LABEL = {
  voeding: "Voeding",
  kracht: "Kracht",
  loop: "Looptraining",
  herstel: "Herstel",
  mentaal: "Sportpsychologie",
  anders: "Anders",
};

const LOG_TYPE_COLOR = {
  training: "bg-orange-100 text-orange-800 border-orange-300",
  blessure: "bg-rose-100 text-rose-800 border-rose-300",
  aandacht: "bg-orange-100 text-orange-800 border-orange-300",
  voeding: "bg-emerald-100 text-emerald-800 border-emerald-300",
  schema: "bg-slate-200 text-slate-800 border-slate-400",
  overig: "bg-stone-100 text-stone-700 border-stone-300",
};

const TRAINING_FEEL_SCALE = [
  { v: 1, emoji: "😞", label: "Heel slecht" },
  { v: 2, emoji: "🙁", label: "Slecht" },
  { v: 3, emoji: "😐", label: "Neutraal" },
  { v: 4, emoji: "🙂", label: "Goed" },
  { v: 5, emoji: "😄", label: "Super" },
];

// Kleurcodering voor alle 5-punts scores (mood, vermoeidheid, fysieke toestand, trainingsgevoel).
const SCORE_COLOR = {
  1: "bg-red-700 text-white",
  2: "bg-red-300 text-red-900",
  3: "bg-orange-400 text-white",
  4: "bg-green-300 text-green-900",
  5: "bg-green-700 text-white",
};

// Toont een specialist onder zijn eigen gekozen titel i.p.v. "Specialist", indien ingesteld.
function roleDisplay(user) {
  if (!user) return "";
  if (user.role === "specialist" && user.title) return user.title;
  return ROLE_LABEL[user.role];
}

function isPastTraining(training) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(training.date + "T00:00:00") < today;
}

function isSchemaExpired(schema) {
  if (!schema.endDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(schema.endDate + "T00:00:00") < today;
}

// Kleurt een logboekblokje naar de score (1-5) die eraan gekoppeld is; grijs als er niet gescoord is.
function logScoreColor(score) {
  const map = {
    1: "bg-red-700 text-white border-red-800",
    2: "bg-red-300 text-red-900 border-red-400",
    3: "bg-orange-400 text-white border-orange-500",
    4: "bg-green-300 text-green-900 border-green-400",
    5: "bg-green-700 text-white border-green-800",
  };
  return map[score] || "bg-stone-100 text-stone-600 border-stone-300";
}

const initialUsers = [
  { id: "u1", firstName: "Anne", lastName: "de Boer", email: "coordinator@kras.nl", role: "coordinator", status: "actief" },
  { id: "u2", firstName: "Mark", lastName: "Visser", email: "trainer@kras.nl", role: "trainer", status: "actief" },
  { id: "u3", firstName: "Sanne", lastName: "Kok", email: "begeleider@kras.nl", role: "begeleider", status: "actief" },
  { id: "u4", firstName: "Dr. Lotte", lastName: "Bakker", email: "specialist@kras.nl", role: "specialist", status: "actief" },
  { id: "u5", firstName: "Tim", lastName: "Jonker", email: "speler@kras.nl", role: "speler", status: "actief" },
  { id: "u6", firstName: "Bram", lastName: "Schilder", email: "bram@mail.nl", role: "speler", status: "actief" },
  { id: "u7", firstName: "Nina", lastName: "Kramer", email: "nina@mail.nl", role: "speler", status: "actief" },
  { id: "u8", firstName: "Joris", lastName: "Veen", email: "joris@mail.nl", role: "speler", status: "in afwachting" },
];

const initialPlayers = [
  {
    id: "p1", userId: "u5", name: "Tim Jonker", city: "Volendam", dob: "2009-03-12",
    positions: ["Rechteropbouw"],
    mood: 4, fatigue: 4, physicalCondition: 5, coachIds: ["u2", "u3", "u4"],
  },
  {
    id: "p2", userId: "u6", name: "Bram Schilder", city: "Edam", dob: "2008-11-02",
    positions: ["Cirkel"],
    mood: 2, fatigue: 2, physicalCondition: 1, coachIds: ["u2", "u4"],
  },
  {
    id: "p3", userId: "u7", name: "Nina Kramer", city: "Volendam", dob: "2010-06-25",
    positions: ["Keeper"],
    mood: 3, fatigue: 3, physicalCondition: 3, coachIds: ["u2", "u3"],
  },
];

// Modules die een speler kan volgen. "Basis" is altijd geselecteerd.
const MODULE_OPTIONS = ["Basis", "Blessurepreventie", "Positietraining", "Kracht", "Hoger team", "Handbalschool", "Handbalskoal", "Papendal"];
const MODULE_ALWAYS_ON = "Basis";

const WEEK_DAYS = [
  { key: "ma", label: "Maandag" },
  { key: "di", label: "Dinsdag" },
  { key: "wo", label: "Woensdag" },
  { key: "do", label: "Donderdag" },
  { key: "vr", label: "Vrijdag" },
  { key: "za", label: "Zaterdag" },
  { key: "zo", label: "Zondag" },
];
const WEEK_ENTRY_KINDS = [
  { key: "school", label: "School", emoji: "🎒", color: "bg-sky-50 border-sky-200 text-sky-900" },
  { key: "training", label: "Training", emoji: "🤾", color: "bg-orange-50 border-orange-200 text-orange-900" },
  { key: "anders", label: "Anders", emoji: "📌", color: "bg-stone-50 border-stone-200 text-stone-800" },
];

const POSITION_OPTIONS = ["Linkerhoek", "Linker opbouw", "Midden opbouw", "Rechter opbouw", "Rechterhoek", "Cirkel", "Keeper"];
const TRAINING_TYPE_OPTIONS = ["Kracht", "Team", "Positie", "Loop", "Wedstrijd", "Anders"];
const TRAINING_LOCATION_OPTIONS = ["Opperdam", "Seinpaal", "Succes", "Kreil", "Anders"];

const MOOD_SCALE = [
  { v: 1, emoji: "😞", label: "Heel laag" },
  { v: 2, emoji: "🙁", label: "Laag" },
  { v: 3, emoji: "😐", label: "Neutraal" },
  { v: 4, emoji: "🙂", label: "Goed" },
  { v: 5, emoji: "😄", label: "Super goed" },
];
const FATIGUE_SCALE = [
  { v: 1, emoji: "🥱", label: "Supermoe" },
  { v: 2, emoji: "😪", label: "Moe" },
  { v: 3, emoji: "😐", label: "Gemiddeld" },
  { v: 4, emoji: "🙂", label: "Fit" },
  { v: 5, emoji: "⚡", label: "Superfit" },
];
const CONDITION_SCALE = [
  { v: 1, emoji: "🤕", label: "Volledig geblesseerd" },
  { v: 2, emoji: "😣", label: "Flinke klachten" },
  { v: 3, emoji: "😐", label: "Pijntjes" },
  { v: 4, emoji: "🙂", label: "Bijna klachtenvrij" },
  { v: 5, emoji: "💪", label: "Nergens last van" },
];

// Talent Volg Systeem (TVS): per speler een score voor "willen" en "kunnen" (1-3), die samen een type opleveren.
const TVS_LEVELS = [1, 2, 3];
const TVS_TYPES = {
  "1-1": "Just fun",
  "1-2": "Breedtesporter",
  "1-3": "Verloren talent",
  "2-1": "Enthousiaste sporter",
  "2-2": "Teamspeler",
  "2-3": "Goede performer",
  "3-1": "Harde werker",
  "3-2": "Steady developer",
  "3-3": "Outperformer",
};
const TVS_DEVELOPMENT_SCALE = [
  { v: 1, emoji: "😞", label: "Ver onder wens" },
  { v: 2, emoji: "🙁", label: "Onder wens" },
  { v: 3, emoji: "😐", label: "Zoals verwacht" },
  { v: 4, emoji: "🙂", label: "Boven wens" },
  { v: 5, emoji: "😄", label: "Ver boven wens" },
];
function tvsTypeLabel(tvs) {
  if (!tvs || !tvs.willen || !tvs.kunnen) return null;
  return TVS_TYPES[`${tvs.willen}-${tvs.kunnen}`] || null;
}

const initialTrainings = [
  {
    id: "t1", name: "Conditietraining", type: "Loop", location: "Opperdam", date: "2026-09-14", time: "18:00", duration: 60,
    notes: "Focus op sprintkracht.", trainerIds: ["u2"], playerIds: ["p1", "p2", "p3"],
    attendance: { p1: "aanwezig", p2: "onbekend", p3: "afwezig" }, seriesId: null,
    chat: [{ from: "u2", text: "Verzamelen om 17:45 bij de ingang." }],
  },
  {
    id: "t2", name: "Tactiektraining", type: "Team", location: "Seinpaal", date: "2026-09-16", time: "19:00", duration: 90,
    notes: "", trainerIds: ["u2", "u3"], playerIds: ["p1", "p2", "p3"],
    attendance: { p1: "onbekend", p2: "onbekend", p3: "onbekend" }, seriesId: null, chat: [],
  },
  {
    id: "t3", name: "Wedstrijd HV KRAS 1", type: "Wedstrijd", location: "Succes", date: "2026-09-20", time: "14:30", duration: 70,
    notes: "Uitwedstrijd.", trainerIds: ["u2"], playerIds: ["p1", "p3"],
    attendance: { p1: "aanwezig", p3: "aanwezig" }, seriesId: null, chat: [],
  },
];

const initialSchemas = [
  {
    id: "s1", name: "Krachtschema onderlichaam", type: "kracht", playerIds: ["p1"], specialistId: "u4", endDate: "",
    description: "2x per week uitvoeren, rustig opbouwen in gewicht.",
    items: [
      { id: "i1", label: "Squat", unit: "kg", target: 90 },
      { id: "i2", label: "Deadlift", unit: "kg", target: 110 },
      { id: "i3", label: "Lunges", unit: "kg", target: 20 },
    ],
  },
  {
    id: "s2", name: "Voedingsschema wedstrijddag", type: "voeding", playerIds: ["p1", "p3"], specialistId: "u4", endDate: "",
    description: "Extra koolhydraten op wedstrijddagen.",
    items: [
      { id: "i4", label: "Ontbijt", unit: "", target: "" },
      { id: "i5", label: "Lunch", unit: "", target: "" },
    ],
  },
  {
    id: "s3", name: "Herstelschema enkel", type: "herstel", playerIds: ["p2"], specialistId: "u4", endDate: "2026-09-01",
    description: "Dagelijks uitvoeren tot volledig herstel.",
    items: [{ id: "i6", label: "Enkel mobiliteit", unit: "min", target: 10 }],
  },
];

const initialLogbook = [
  { id: "l1", playerId: "p1", type: "training", title: "Sterke conditietraining", note: "Goede intensiteit gehaald.", date: "2026-09-08", author: "Mark Visser", score: 5 },
  { id: "l2", playerId: "p2", type: "blessure", title: "Enkel gekneusd", note: "Rust voorgeschreven, controle volgende week.", date: "2026-09-05", author: "Dr. Lotte Bakker", score: 1 },
  { id: "l3", playerId: "p1", type: "schema", title: "Krachtschema onderlichaam [Squat: 85 kg, Deadlift: 105 kg, Lunges: 18 kg]", note: "", date: "2026-09-09", author: "Tim Jonker", schemaId: "s1" },
];

const initialConversations = [
  {
    id: "c1", participantIds: ["u2", "u5"],
    messages: [
      { from: "u2", text: "Hoi Tim, hoe voelt de enkel na de laatste training?", time: "09:12" },
      { from: "u5", text: "Ging goed, geen pijn meer!", time: "09:20" },
    ],
  },
  {
    id: "c2", participantIds: ["u4", "u5"],
    messages: [{ from: "u4", text: "Je nieuwe krachtschema staat klaar.", time: "gisteren" }],
  },
];

const TABS = {
  coordinator: [
    { key: "home", label: "Home", icon: Home },
    { key: "spelers", label: "Spelers", icon: Users },
    { key: "staf", label: "Staf", icon: UserCheck },
    { key: "beheer", label: "Beheer", icon: Shield },
    { key: "trainingen", label: "Trainingen", icon: Calendar },
    { key: "berichten", label: "Berichten", icon: MessageSquare },
    { key: "meer", label: "Meer", icon: MoreHorizontal },
  ],
  trainer: [
    { key: "home", label: "Home", icon: Home },
    { key: "spelers", label: "Spelers", icon: Users },
    { key: "trainingen", label: "Trainingen", icon: Calendar },
    { key: "berichten", label: "Berichten", icon: MessageSquare },
    { key: "meer", label: "Meer", icon: MoreHorizontal },
  ],
  begeleider: [
    { key: "home", label: "Home", icon: Home },
    { key: "spelers", label: "Spelers", icon: Users },
    { key: "trainingen", label: "Trainingen", icon: Calendar },
    { key: "berichten", label: "Berichten", icon: MessageSquare },
    { key: "meer", label: "Meer", icon: MoreHorizontal },
  ],
  specialist: [
    { key: "home", label: "Home", icon: Home },
    { key: "spelers", label: "Spelers", icon: Users },
    { key: "schemas", label: "Schema's", icon: ClipboardList },
    { key: "trainingen", label: "Trainingen", icon: Calendar },
    { key: "berichten", label: "Berichten", icon: MessageSquare },
    { key: "meer", label: "Meer", icon: MoreHorizontal },
  ],
  speler: [
    { key: "eigen", label: "Agenda", icon: Calendar },
    { key: "voortgang", label: "Voortgang", icon: TrendingUp },
    { key: "schemas", label: "Schema's", icon: ClipboardList },
    { key: "modules", label: "Modules", icon: Layers },
    { key: "berichten", label: "Berichten", icon: MessageSquare },
    { key: "meer", label: "Meer", icon: MoreHorizontal },
  ],
};

const DAY_NAMES = ["zo", "ma", "di", "wo", "do", "vr", "za"];

function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

// Formatteert een Date naar YYYY-MM-DD op basis van de LOKALE kalenderdag.
// Nooit .toISOString() gebruiken voor datums: die rekent om naar UTC en kan
// daardoor een dag verschuiven (bijv. 21 sept wordt 20 sept in UTC+1/+2).
function toISODateLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayLocalISO() {
  return toISODateLocal(new Date());
}

function startOfWeek(dateObj) {
  const d = new Date(dateObj);
  const day = (d.getDay() + 6) % 7; // maandag = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Twee gebruikers mogen elkaar berichten als: beiden staf zijn, of als de speler
// gekoppeld is aan die staf-persoon (via player.coachIds). Spelers onderling niet.
function canMessage(a, b, players) {
  if (a.role !== "speler" && b.role !== "speler") return true;
  if (a.role === "speler" && b.role === "speler") return false;
  const staffUser = a.role === "speler" ? b : a;
  const playerUser = a.role === "speler" ? a : b;
  const player = players.find((p) => p.userId === playerUser.id);
  return !!player && player.coachIds.includes(staffUser.id);
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export default function KrasApp() {
  const [users, setUsers] = useState(initialUsers);
  const [players, setPlayers] = useState(initialPlayers);
  const [trainings, setTrainings] = useState(initialTrainings);
  const [schemas, setSchemas] = useState(initialSchemas);
  const [logbook, setLogbook] = useState(initialLogbook);
  const [conversations, setConversations] = useState(initialConversations);

  const [currentUserId, setCurrentUserId] = useState(null);
  const [tab, setTab] = useState("home");
  const [showDemoPanel, setShowDemoPanel] = useState(false);
  const [detailPlayerId, setDetailPlayerId] = useState(null);
  const [detailSchemaId, setDetailSchemaId] = useState(null);
  const [detailTrainingId, setDetailTrainingId] = useState(null);
  const [activeConvoId, setActiveConvoId] = useState(null);
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date("2026-09-14")));
  const [toast, setToast] = useState("");
  const [chatReadCounts, setChatReadCounts] = useState({});
  const [seenConversationCounts, setSeenConversationCounts] = useState({});
  const [beheerSeenCount, setBeheerSeenCount] = useState(0);
  const [seenSchemaIds, setSeenSchemaIds] = useState([]);
  // Per gebruiker bijgehouden welke nieuwe trainingen al bekeken zijn.
  const [seenTrainingIds, setSeenTrainingIds] = useState({});
  // Wijzigingen van spelers naar een rode score (<= 2) in hun voortgang, en per gebruiker welke al gezien zijn.
  const [progressAlerts, setProgressAlerts] = useState([]);
  const [seenAlertIds, setSeenAlertIds] = useState({});

  const currentUser = users.find((u) => u.id === currentUserId) || null;
  const role = currentUser?.role;

  function markTrainingRead(trainingId) {
    const t = trainings.find((x) => x.id === trainingId);
    if (!t) return;
    setChatReadCounts((c) => ({ ...c, [trainingId]: (t.chat || []).length }));
  }

  function markConversationRead(convoId) {
    const c = conversations.find((x) => x.id === convoId);
    if (!c) return;
    setSeenConversationCounts((s) => ({ ...s, [convoId]: c.messages.length }));
  }

  function markTrainingSeen(trainingId) {
    if (!currentUser) return;
    const t = trainings.find((x) => x.id === trainingId);
    if (!t) return;
    const ids = t.seriesId ? trainings.filter((x) => x.seriesId === t.seriesId).map((x) => x.id) : [t.id];
    setSeenTrainingIds((s) => ({ ...s, [currentUser.id]: Array.from(new Set([...(s[currentUser.id] || []), ...ids])) }));
  }

  function markPlayerAlertsSeen(playerId) {
    if (!currentUser) return;
    const ids = progressAlerts.filter((a) => a.playerId === playerId).map((a) => a.id);
    if (ids.length === 0) return;
    setSeenAlertIds((s) => ({ ...s, [currentUser.id]: Array.from(new Set([...(s[currentUser.id] || []), ...ids])) }));
  }

  function markSchemaSeen(schemaId) {
    setSeenSchemaIds((s) => (s.includes(schemaId) ? s : [...s, schemaId]));
  }

  function markBeheerSeen() {
    setBeheerSeenCount(users.filter((u) => u.status === "in afwachting").length);
  }

  function conversationHasUnread(convo) {
    if (!currentUser || !convo.messages.length) return false;
    const last = convo.messages[convo.messages.length - 1];
    if (last.from === currentUser.id) return false;
    return (seenConversationCounts[convo.id] || 0) < convo.messages.length;
  }

  function login(email, password) {
    const u = users.find((x) => x.email === email);
    if (!u) return "E-mailadres of wachtwoord onjuist";
    if (password !== "demo123") return "E-mailadres of wachtwoord onjuist";
    if (u.status === "in afwachting") return "Je account wacht nog op goedkeuring door een coördinator.";
    if (u.status === "geblokkeerd") return "Dit account is geblokkeerd. Neem contact op met de coördinator.";
    setCurrentUserId(u.id);
    setTab(TABS[u.role][0].key);
    return null;
  }

  function logout() {
    setCurrentUserId(null);
    setDetailPlayerId(null);
    setDetailSchemaId(null);
    setDetailTrainingId(null);
    setActiveConvoId(null);
  }

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  if (!currentUser) {
    return (
      <LoginScreen
        onLogin={login}
        onDemoLogin={(id) => {
          setCurrentUserId(id);
          setTab(TABS[users.find((u) => u.id === id).role][0].key);
        }}
        users={users}
      />
    );
  }

  const tabs = TABS[role];
  const myPlayer = players.find((p) => p.userId === currentUser.id);
  const berichtenUnread = conversations.some((c) => c.participantIds.includes(currentUser.id) && conversationHasUnread(c));
  const trainingenUnread = trainings.some(
    (t) =>
      isNewTrainingFor(t, currentUser.id, players, seenTrainingIds) ||
      (isInvolvedInTraining(t, currentUser.id, players) && unreadChatCount(t, currentUser.id, chatReadCounts))
  );
  // Voortgangswijzigingen naar rood: alleen voor trainer/begeleider, alleen van gekoppelde spelers.
  const seenAlertsMe = seenAlertIds[currentUser.id] || [];
  const alertLabelsByPlayer = {};
  if (role === "trainer" || role === "begeleider") {
    progressAlerts.forEach((a) => {
      const pl = players.find((p) => p.id === a.playerId);
      if (!pl || !pl.coachIds.includes(currentUser.id) || seenAlertsMe.includes(a.id)) return;
      const label = PROGRESS_FIELD_LABEL[a.field];
      alertLabelsByPlayer[a.playerId] = Array.from(new Set([...(alertLabelsByPlayer[a.playerId] || []), label]));
    });
  }
  const spelersUnread = Object.keys(alertLabelsByPlayer).length > 0;
  const pendingCount = users.filter((u) => u.status === "in afwachting").length;
  const beheerUnread = pendingCount > beheerSeenCount;
  const mySchemas = myPlayer ? schemas.filter((s) => s.playerIds.includes(myPlayer.id)) : [];
  const schemasUnread = role === "speler" && mySchemas.some((s) => !seenSchemaIds.includes(s.id));
  const TAB_UNREAD = {
    berichten: berichtenUnread,
    trainingen: trainingenUnread,
    eigen: role === "speler" && trainingenUnread,
    beheer: beheerUnread,
    schemas: schemasUnread,
    spelers: spelersUnread,
  };

  return (
    <div className="h-dvh bg-stone-200 flex justify-center font-sans overflow-hidden">
      <div className="w-full max-w-md bg-white h-full flex flex-col relative shadow-xl overflow-hidden">
        {/* Top bar */}
        <div className="bg-white text-slate-900 px-4 pt-4 pb-3 flex items-center justify-between border-b border-stone-200 shrink-0 z-20">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-orange-600 font-bold">KrasApp</div>
            <div className="text-lg font-bold leading-tight text-slate-900">{tabLabel(tabs, tab)}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDemoPanel((v) => !v)}
              className="bg-orange-50 text-orange-700 text-[10px] font-bold px-2 py-1.5 rounded-full"
            >
              Rol wisselen
            </button>
            <button
              onClick={() => setTab("meer")}
              className="w-9 h-9 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-sm shrink-0"
            >
              {currentUser.firstName[0]}
              {currentUser.lastName[0]}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>
          {tab === "home" && (
            <HomeScreen
              user={currentUser}
              role={role}
              players={players}
              trainings={trainings}
              users={users}
              onOpenPlayer={(id) => {
                setDetailPlayerId(id);
                setTab("spelers");
              }}
            />
          )}

          {tab === "beheer" && role === "coordinator" && (
            <BeheerScreen
              users={users}
              onApprove={(id, newRole) => {
                setUsers((us) => us.map((u) => (u.id === id ? { ...u, role: newRole, status: "actief" } : u)));
                flash("Account goedgekeurd");
              }}
              onReject={(id) => {
                setUsers((us) => us.filter((u) => u.id !== id));
                flash("Account afgewezen en verwijderd");
              }}
              onChangeStatus={(id, status) => {
                setUsers((us) => us.map((u) => (u.id === id ? { ...u, status } : u)));
              }}
              onChangeRole={(id, r) => {
                setUsers((us) => us.map((u) => (u.id === id ? { ...u, role: r } : u)));
              }}
              onDelete={(id) => {
                setUsers((us) => us.filter((u) => u.id !== id));
                flash("Gebruiker verwijderd");
              }}
            />
          )}

          {tab === "staf" && role === "coordinator" && (
            <StafScreen
              users={users}
              players={players}
              onTogglePlayerCoach={(staffId, playerId) => {
                setPlayers((ps) =>
                  ps.map((p) =>
                    p.id === playerId
                      ? { ...p, coachIds: p.coachIds.includes(staffId) ? p.coachIds.filter((id) => id !== staffId) : [...p.coachIds, staffId] }
                      : p
                  )
                );
              }}
            />
          )}

          {tab === "spelers" && role !== "speler" && !detailPlayerId && (
            <SpelersScreen
              players={players}
              currentUser={currentUser}
              alertLabelsByPlayer={alertLabelsByPlayer}
              onOpen={(id) => { setDetailPlayerId(id); markPlayerAlertsSeen(id); }}
            />
          )}
          {tab === "spelers" && detailPlayerId && (
            <SpelerDetailScreen
              player={players.find((p) => p.id === detailPlayerId)}
              users={users}
              logbook={logbook.filter((l) => l.playerId === detailPlayerId)}
              trainings={trainings.filter((t) => t.playerIds.includes(detailPlayerId))}
              canEdit={role === "coordinator" || role === "trainer"}
              viewerRole={role}
              onBack={() => setDetailPlayerId(null)}
              onAddLog={(entry) => {
                setLogbook((lb) => [{ ...entry, id: "l" + Date.now(), playerId: detailPlayerId, author: `${currentUser.firstName} ${currentUser.lastName}` }, ...lb]);
                flash("Logboekregel toegevoegd");
              }}
              onToggleCoach={(staffId) => {
                setPlayers((ps) =>
                  ps.map((p) =>
                    p.id === detailPlayerId
                      ? { ...p, coachIds: p.coachIds.includes(staffId) ? p.coachIds.filter((id) => id !== staffId) : [...p.coachIds, staffId] }
                      : p
                  )
                );
              }}
              onTogglePosition={(pos) => {
                setPlayers((ps) =>
                  ps.map((p) =>
                    p.id === detailPlayerId
                      ? { ...p, positions: p.positions.includes(pos) ? p.positions.filter((x) => x !== pos) : [...p.positions, pos] }
                      : p
                  )
                );
              }}
              onUpdateCondition={(value) => {
                setPlayers((ps) => ps.map((p) => (p.id === detailPlayerId ? { ...p, physicalCondition: value } : p)));
              }}
              onDeleteLog={(logId) => {
                setLogbook((lb) => lb.filter((l) => l.id !== logId));
                flash("Logregel verwijderd");
              }}
              onUpdateTvs={(changes) => {
                setPlayers((ps) => ps.map((p) => (p.id === detailPlayerId ? { ...p, tvs: { ...(p.tvs || {}), ...changes } } : p)));
              }}
              onToggleModule={(m) => {
                if (m === MODULE_ALWAYS_ON) return;
                setPlayers((ps) =>
                  ps.map((p) => {
                    if (p.id !== detailPlayerId) return p;
                    const current = Array.from(new Set([MODULE_ALWAYS_ON, ...(p.modules || [])]));
                    return { ...p, modules: current.includes(m) ? current.filter((x) => x !== m) : [...current, m] };
                  })
                );
              }}
            />
          )}

          {(tab === "trainingen") && role !== "speler" && !detailTrainingId && (
            <TrainingenScreen
              trainings={trainings}
              players={players}
              users={users}
              currentUser={currentUser}
              chatReadCounts={chatReadCounts}
              seenTrainingIds={seenTrainingIds}
              weekAnchor={weekAnchor}
              setWeekAnchor={setWeekAnchor}
              onOpen={(id) => { setDetailTrainingId(id); markTrainingRead(id); markTrainingSeen(id); }}
              onCreate={(t) => {
                const { recurrence, weeks, ...base } = t;
                const count = recurrence === "wekelijks" ? Math.max(2, weeks || 2) : 1;
                const seriesId = recurrence === "wekelijks" ? "series" + Date.now() : null;
                const newOnes = [...Array(count)].map((_, i) => {
                  const d = new Date(base.date + "T00:00:00");
                  d.setDate(d.getDate() + i * 7);
                  return { ...base, id: "t" + Date.now() + "_" + i, date: toISODateLocal(d), attendance: {}, chat: [], seriesId, createdBy: currentUser.id };
                });
                setTrainings((ts) => [...ts, ...newOnes]);
                flash(count > 1 ? `${count} wekelijkse trainingen aangemaakt` : "Training aangemaakt");
              }}
            />
          )}
          {tab === "trainingen" && detailTrainingId && (
            <TrainingDetailScreen
              training={trainings.find((t) => t.id === detailTrainingId)}
              players={players}
              users={users}
              currentUser={currentUser}
              onBack={() => setDetailTrainingId(null)}
              onSetAttendance={(playerId, status) => {
                setTrainings((ts) =>
                  ts.map((t) => (t.id === detailTrainingId ? { ...t, attendance: { ...t.attendance, [playerId]: status } } : t))
                );
              }}
              onDelete={() => {
                setTrainings((ts) => ts.filter((t) => t.id !== detailTrainingId));
                setDetailTrainingId(null);
                flash("Training verwijderd");
              }}
              onSendMessage={(text) => {
                setTrainings((ts) =>
                  ts.map((t) => (t.id === detailTrainingId ? { ...t, chat: [...(t.chat || []), { from: currentUser.id, text }] } : t))
                );
              }}
              onUpdateTraining={(changes, scope) => {
                const base = trainings.find((t) => t.id === detailTrainingId);
                setTrainings((ts) =>
                  ts.map((t) => {
                    const inScope = scope === "series" && base.seriesId ? t.seriesId === base.seriesId : t.id === detailTrainingId;
                    if (!inScope) return t;
                    if (scope === "series") {
                      const { date, ...rest } = changes;
                      return { ...t, ...rest };
                    }
                    return { ...t, ...changes };
                  })
                );
                flash(scope === "series" ? "Hele reeks bijgewerkt" : "Training bijgewerkt");
              }}
              onCancelTraining={(scope, message) => {
                const base = trainings.find((t) => t.id === detailTrainingId);
                setTrainings((ts) =>
                  ts.map((t) => {
                    const inScope = scope === "series" && base.seriesId ? t.seriesId === base.seriesId : t.id === detailTrainingId;
                    if (!inScope) return t;
                    return { ...t, cancelled: true, chat: [...(t.chat || []), { from: currentUser.id, text: message }] };
                  })
                );
                flash(scope === "series" ? "Trainingenreeks geannuleerd" : "Training geannuleerd");
              }}
            />
          )}

          {tab === "schemas" && role === "specialist" && !detailSchemaId && (
            <SpecialistSchemasScreen
              schemas={schemas.filter((s) => s.specialistId === currentUser.id)}
              players={players}
              onOpen={(id) => setDetailSchemaId(id)}
              onCreate={(s) => {
                setSchemas((ss) => [...ss, { ...s, id: "s" + Date.now(), specialistId: currentUser.id }]);
                flash("Schema aangemaakt");
              }}
            />
          )}
          {tab === "schemas" && role === "specialist" && detailSchemaId && (
            <SchemaDetailScreen
              schema={schemas.find((s) => s.id === detailSchemaId)}
              players={players}
              onBack={() => setDetailSchemaId(null)}
              onDelete={() => {
                setSchemas((ss) => ss.filter((s) => s.id !== detailSchemaId));
                setDetailSchemaId(null);
                flash("Schema verwijderd");
              }}
              onUpdate={(changes) => {
                setSchemas((ss) => ss.map((s) => (s.id === detailSchemaId ? { ...s, ...changes } : s)));
                flash("Schema bijgewerkt");
              }}
            />
          )}

          {tab === "schemas" && role === "speler" && !detailSchemaId && (
            <SpelerSchemasScreen
              schemas={schemas.filter((s) => s.playerIds.includes(players.find((p) => p.userId === currentUser.id)?.id))}
              seenSchemaIds={seenSchemaIds}
              onOpen={(id) => { setDetailSchemaId(id); markSchemaSeen(id); }}
            />
          )}
          {tab === "schemas" && role === "speler" && detailSchemaId && (
            <SpelerSchemaLogScreen
              schema={schemas.find((s) => s.id === detailSchemaId)}
              onBack={() => setDetailSchemaId(null)}
              onLog={(values, note, overallScore) => {
                const schema = schemas.find((s) => s.id === detailSchemaId);
                const parts = schema.items
                  .filter((it) => values[it.id])
                  .map((it) => `${it.label}: ${TRAINING_FEEL_SCALE.find((s) => s.v === values[it.id])?.label}`)
                  .join(", ");
                const title = `${schema.name} [${parts}]`;
                const myPlayer = players.find((p) => p.userId === currentUser.id);
                setLogbook((lb) => [
                  {
                    id: "l" + Date.now(),
                    playerId: myPlayer.id,
                    type: "schema",
                    title,
                    note,
                    score: overallScore,
                    date: todayLocalISO(),
                    author: `${currentUser.firstName} ${currentUser.lastName}`,
                    schemaId: detailSchemaId,
                  },
                  ...lb,
                ]);
                flash("Schema gelogd in je logboek");
                setDetailSchemaId(null);
              }}
            />
          )}

          {tab === "eigen" && role === "speler" && (
            <SpelerEigenScreen
              player={players.find((p) => p.userId === currentUser.id)}
              trainings={trainings.filter((t) => t.playerIds.includes(players.find((p) => p.userId === currentUser.id)?.id))}
              users={users}
              currentUser={currentUser}
              chatReadCounts={chatReadCounts}
              seenTrainingIds={seenTrainingIds}
              onOpenChat={(trainingId) => { markTrainingRead(trainingId); markTrainingSeen(trainingId); }}
              onSetOwnAttendance={(trainingId, status) => {
                markTrainingSeen(trainingId);
                const myPlayer = players.find((p) => p.userId === currentUser.id);
                setTrainings((ts) =>
                  ts.map((t) => (t.id === trainingId ? { ...t, attendance: { ...t.attendance, [myPlayer.id]: status } } : t))
                );
                flash(status === "aanwezig" ? "Je bent aangemeld" : "Je bent afgemeld");
              }}
              onSendTrainingMessage={(trainingId, text) => {
                setTrainings((ts) =>
                  ts.map((t) => (t.id === trainingId ? { ...t, chat: [...(t.chat || []), { from: currentUser.id, text }] } : t))
                );
              }}
              onLogTraining={(trainingId, mood, note) => {
                const t = trainings.find((x) => x.id === trainingId);
                const myPlayer = players.find((p) => p.userId === currentUser.id);
                setLogbook((lb) => [
                  {
                    id: "l" + Date.now(),
                    playerId: myPlayer.id,
                    type: "training",
                    title: `${t.name} ${TRAINING_FEEL_SCALE.find((s) => s.v === mood)?.emoji}`,
                    note,
                    score: mood,
                    date: todayLocalISO(),
                    author: `${currentUser.firstName} ${currentUser.lastName}`,
                    trainingId,
                  },
                  ...lb,
                ]);
                flash("Training gelogd");
              }}
            />
          )}

          {tab === "modules" && role === "speler" && (
            <ModulesScreen
              player={players.find((p) => p.userId === currentUser.id)}
              onUpdate={(field, value) => {
                setPlayers((ps) => ps.map((p) => (p.userId === currentUser.id ? { ...p, [field]: value } : p)));
              }}
            />
          )}

          {tab === "voortgang" && role === "speler" && (
            <VoortgangScreen
              player={players.find((p) => p.userId === currentUser.id)}
              logbook={logbook.filter((l) => l.playerId === players.find((p) => p.userId === currentUser.id)?.id)}
              onUpdate={(field, value) => {
                const me = players.find((p) => p.userId === currentUser.id);
                // Verandert de speler een score naar rood (1 of 2)? Dan krijgen gekoppelde trainers/begeleiders een rood puntje.
                if (me && PROGRESS_FIELD_LABEL[field] && value <= 2 && me[field] !== value) {
                  setProgressAlerts((a) => [...a, { id: "a" + Date.now() + "_" + field, playerId: me.id, field }]);
                }
                setPlayers((ps) => ps.map((p) => (p.userId === currentUser.id ? { ...p, [field]: value } : p)));
              }}
            />
          )}

          {tab === "berichten" && !activeConvoId && (
            <BerichtenScreen
              currentUser={currentUser}
              users={users}
              players={players}
              conversations={conversations}
              conversationHasUnread={conversationHasUnread}
              onOpen={(id) => { setActiveConvoId(id); markConversationRead(id); }}
              onStart={(userId) => {
                const existing = conversations.find(
                  (c) => !c.isGroup && c.participantIds.includes(currentUser.id) && c.participantIds.includes(userId)
                );
                if (existing) {
                  setActiveConvoId(existing.id);
                  markConversationRead(existing.id);
                } else {
                  const nc = { id: "c" + Date.now(), participantIds: [currentUser.id, userId], messages: [] };
                  setConversations((cs) => [nc, ...cs]);
                  setActiveConvoId(nc.id);
                }
              }}
            />
          )}
          {tab === "berichten" && activeConvoId && (
            <ChatScreen
              convo={conversations.find((c) => c.id === activeConvoId)}
              currentUser={currentUser}
              users={users}
              onBack={() => setActiveConvoId(null)}
              onSend={(text) => {
                setConversations((cs) =>
                  cs.map((c) =>
                    c.id === activeConvoId ? { ...c, messages: [...c.messages, { from: currentUser.id, text, time: "nu" }] } : c
                  )
                );
              }}
            />
          )}

          {tab === "meer" && (
            <MeerScreen
              user={currentUser}
              role={role}
              users={users}
              onLogout={logout}
              onOpenPlayerNamesOnly={role === "speler"}
              players={players}
              onUpdateTitle={(title) => {
                setUsers((us) => us.map((u) => (u.id === currentUser.id ? { ...u, title } : u)));
                flash("Titel bijgewerkt");
              }}
            />
          )}
        </div>

        {/* Bottom tab bar */}
        <div className="shrink-0 bg-white border-t border-stone-200 flex z-30" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key);
                  setDetailPlayerId(null);
                  setDetailSchemaId(null);
                  setDetailTrainingId(null);
                  setActiveConvoId(null);
                  if (t.key === "beheer") markBeheerSeen();
                }}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 relative ${
                  active ? "text-orange-600" : "text-stone-400"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span className={`text-[10px] ${active ? "font-semibold" : ""}`}>{t.label}</span>
                {TAB_UNREAD[t.key] && (
                  <span className="absolute top-1.5 right-6 w-2.5 h-2.5 bg-rose-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {toast && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-2 rounded-full shadow-lg z-40">
            {toast}
          </div>
        )}

        {showDemoPanel && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowDemoPanel(false)}>
            <div className="bg-white rounded-2xl p-4 w-72" onClick={(e) => e.stopPropagation()}>
              <div className="font-bold text-slate-900 mb-2">Test als rol</div>
              {Object.entries(ROLE_LABEL).map(([r, label]) => {
                const u = users.find((x) => x.role === r && x.status === "actief");
                if (!u) return null;
                return (
                  <button
                    key={r}
                    onClick={() => {
                      setCurrentUserId(u.id);
                      setTab(TABS[r][0].key);
                      setShowDemoPanel(false);
                      setDetailPlayerId(null);
                      setDetailSchemaId(null);
                      setDetailTrainingId(null);
                      setActiveConvoId(null);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-stone-100 flex items-center justify-between mb-1"
                  >
                    <span>{label}</span>
                    <span className="text-xs text-stone-400">{u.firstName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function tabLabel(tabs, key) {
  return tabs.find((t) => t.key === key)?.label || "";
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

function LoginScreen({ onLogin, onDemoLogin, users }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [registered, setRegistered] = useState(false);

  return (
    <div className="h-dvh bg-orange-50 flex justify-center overflow-y-auto">
      <div className="w-full max-w-sm p-6 py-10">
        <div className="text-center mb-8">
          <div className="text-stone-500 text-sm font-semibold tracking-wide uppercase mb-1">Sportclub</div>
          <div className="text-orange-600 text-4xl font-black">KrasApp</div>
        </div>

        {registered ? (
          <div className="bg-white rounded-2xl p-6 text-center">
            <div className="font-bold text-slate-900 mb-2">Account aangemaakt</div>
            <p className="text-sm text-stone-600 mb-4">
              Je account wacht op goedkeuring door een coördinator voordat je kunt inloggen.
            </p>
            <button onClick={() => { setRegistered(false); setShowRegister(false); }} className="text-orange-600 font-semibold text-sm">
              Terug naar inloggen
            </button>
          </div>
        ) : showRegister ? (
          <RegisterForm
            onCancel={() => setShowRegister(false)}
            onSubmit={() => setRegistered(true)}
          />
        ) : (
          <div className="bg-white rounded-2xl p-6">
            <label className="text-xs font-semibold text-stone-500 uppercase">E-mailadres</label>
            <input
              className="w-full border border-stone-300 rounded-lg px-3 py-2 mt-1 mb-3 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="naam@kras.nl"
            />
            <label className="text-xs font-semibold text-stone-500 uppercase">Wachtwoord</label>
            <input
              type="password"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 mt-1 mb-1 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="demo123"
            />
            <button className="text-xs text-orange-600 font-semibold mb-3">Wachtwoord vergeten?</button>
            {error && (
              <div className="text-rose-600 text-xs mb-3 flex items-center gap-1">
                <AlertCircle size={14} /> {error}
              </div>
            )}
            <button
              onClick={() => setError(onLogin(email, password))}
              className="w-full bg-orange-600 text-white font-bold py-2.5 rounded-lg mb-3"
            >
              Inloggen
            </button>
            <button onClick={() => setShowRegister(true)} className="w-full text-center text-sm text-stone-500">
              Nog geen account? <span className="text-orange-600 font-semibold">Registreren</span>
            </button>

            <div className="mt-6 pt-4 border-t border-stone-200">
              <div className="text-[11px] uppercase tracking-wide text-stone-400 font-semibold mb-2">
                Demo-accounts (testen zonder inloggen)
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(ROLE_LABEL).map(([r, label]) => {
                  const u = users.find((x) => x.role === r && x.status === "actief");
                  if (!u) return null;
                  return (
                    <button
                      key={r}
                      onClick={() => onDemoLogin(u.id)}
                      className="text-xs bg-stone-100 hover:bg-stone-200 rounded-lg py-2 font-medium text-slate-700"
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RegisterForm({ onCancel, onSubmit }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", city: "", dob: "", email: "", password: "", password2: "" });
  const [error, setError] = useState("");
  return (
    <div className="bg-white rounded-2xl p-6">
      <div className="font-bold text-slate-900 mb-3">Account aanmaken</div>
      {["firstName", "lastName", "city", "dob", "email", "password", "password2"].map((f) => (
        <input
          key={f}
          type={f.includes("password") ? "password" : f === "dob" ? "date" : "text"}
          placeholder={
            { firstName: "Voornaam", lastName: "Achternaam", city: "Woonplaats", dob: "Geboortedatum", email: "E-mailadres", password: "Wachtwoord", password2: "Herhaal wachtwoord" }[f]
          }
          className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-2 text-sm"
          value={form[f]}
          onChange={(e) => setForm({ ...form, [f]: e.target.value })}
        />
      ))}
      {error && <div className="text-rose-600 text-xs mb-2">{error}</div>}
      <button
        onClick={() => {
          if (form.password.length < 6) return setError("Wachtwoord moet minimaal 6 tekens zijn.");
          if (form.password !== form.password2) return setError("Wachtwoorden komen niet overeen.");
          if (!form.email) return setError("Vul een e-mailadres in.");
          onSubmit();
        }}
        className="w-full bg-orange-600 text-white font-bold py-2.5 rounded-lg mb-2"
      >
        Registreren
      </button>
      <button onClick={onCancel} className="w-full text-center text-sm text-stone-500">
        Annuleren
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

function HomeScreen({ user, role, players, trainings, users, onOpenPlayer }) {
  // Alleen trainingen waar de ingelogde persoon zelf bij is ingedeeld.
  const upcoming = trainings
    .filter((t) => isInvolvedInTraining(t, user.id, players))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 3);
  const aandacht = players.filter((p) => p.mood <= 2 || p.fatigue <= 2 || p.physicalCondition <= 2);
  return (
    <div className="p-4 space-y-4">
      <div className="bg-orange-600 text-white rounded-2xl p-4">
        <div className="text-orange-100 text-xs uppercase font-semibold">Welkom</div>
        <div className="text-xl font-bold">{user.firstName} {user.lastName}</div>
        <div className="text-orange-100 text-sm">{roleDisplay(user)}</div>
      </div>

      <div>
        <div className="font-bold text-slate-900 mb-2">Komende trainingen</div>
        <div className="space-y-2">
          {upcoming.length === 0 && <div className="text-sm text-stone-400">Je bent bij geen enkele training ingedeeld.</div>}
          {upcoming.map((t) => (
            <div key={t.id} className="bg-white rounded-xl p-3 border border-stone-200 flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm text-slate-900">{t.name}</div>
                <div className="text-xs text-stone-500">{fmtDate(t.date)} · {t.time} · {t.location}</div>
              </div>
              <span className="text-[10px] uppercase font-semibold text-orange-700 bg-orange-100 px-2 py-1 rounded-full">{t.type}</span>
            </div>
          ))}
        </div>
      </div>

      {role !== "speler" && (
        <div>
          <div className="font-bold text-slate-900 mb-2">Aandachtspunten spelers</div>
          <div className="space-y-2">
            {aandacht.length === 0 && <div className="text-sm text-stone-400">Geen bijzonderheden.</div>}
            {aandacht.map((p) => (
              <button key={p.id} onClick={() => onOpenPlayer(p.id)} className="w-full bg-white rounded-xl p-3 border border-stone-200 flex items-center justify-between text-left">
                <div>
                  <div className="font-semibold text-sm text-slate-900">{p.name}</div>
                  <div className="text-xs text-stone-500">{p.positions.join(", ")}</div>
                </div>
                <div className="flex items-center gap-1 text-lg">
                  <span title="Mood">{MOOD_SCALE.find((s) => s.v === p.mood)?.emoji}</span>
                  <span title="Vermoeidheid">{FATIGUE_SCALE.find((s) => s.v === p.fatigue)?.emoji}</span>
                  <span title="Fysieke toestand">{CONDITION_SCALE.find((s) => s.v === p.physicalCondition)?.emoji}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Beheer (coordinator)
// ---------------------------------------------------------------------------

function BeheerScreen({ users, onApprove, onReject, onChangeStatus, onChangeRole, onDelete }) {
  const pending = users.filter((u) => u.status === "in afwachting");
  const active = users.filter((u) => u.status !== "in afwachting");
  const [roleChoice, setRoleChoice] = useState({});

  return (
    <div className="p-4 space-y-5">
      <div>
        <div className="font-bold text-slate-900 mb-2">Wachten op goedkeuring ({pending.length})</div>
        <div className="space-y-2">
          {pending.length === 0 && <div className="text-sm text-stone-400">Geen openstaande aanvragen.</div>}
          {pending.map((u) => (
            <div key={u.id} className="bg-white rounded-xl p-3 border border-stone-200">
              <div className="font-semibold text-sm text-slate-900">{u.firstName} {u.lastName}</div>
              <div className="text-xs text-stone-500 mb-2">{u.email}</div>
              <select
                className="w-full border border-stone-300 rounded-lg px-2 py-1.5 text-sm mb-2"
                value={roleChoice[u.id] || "speler"}
                onChange={(e) => setRoleChoice({ ...roleChoice, [u.id]: e.target.value })}
              >
                {Object.entries(ROLE_LABEL).map(([r, l]) => (
                  <option key={r} value={r}>{l}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button onClick={() => onApprove(u.id, roleChoice[u.id] || "speler")} className="flex-1 bg-emerald-600 text-white text-sm font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1">
                  <Check size={14} /> Goedkeuren
                </button>
                <button onClick={() => onReject(u.id)} className="flex-1 bg-rose-100 text-rose-700 text-sm font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1">
                  <X size={14} /> Afwijzen
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="font-bold text-slate-900 mb-2">Alle gebruikers ({active.length})</div>
        <div className="space-y-2">
          {active.map((u) => (
            <div key={u.id} className="bg-white rounded-xl p-3 border border-stone-200">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-semibold text-sm text-slate-900">{u.firstName} {u.lastName}</div>
                  <div className="text-xs text-stone-500">{u.email}</div>
                </div>
                <button onClick={() => { if (confirm(`${u.firstName} ${u.lastName} permanent verwijderen?`)) onDelete(u.id); }} className="text-rose-500">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex gap-2">
                <select
                  className="flex-1 border border-stone-300 rounded-lg px-2 py-1 text-xs"
                  value={u.role}
                  onChange={(e) => onChangeRole(u.id, e.target.value)}
                >
                  {Object.entries(ROLE_LABEL).map(([r, l]) => (
                    <option key={r} value={r}>{l}</option>
                  ))}
                </select>
                <select
                  className="flex-1 border border-stone-300 rounded-lg px-2 py-1 text-xs"
                  value={u.status}
                  onChange={(e) => onChangeStatus(u.id, e.target.value)}
                >
                  <option value="actief">Actief</option>
                  <option value="geblokkeerd">Geblokkeerd</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Staf — koppel spelers aan trainers/begeleiders/specialisten (coördinator)
// ---------------------------------------------------------------------------

function StafScreen({ users, players, onTogglePlayerCoach }) {
  const [openStaffId, setOpenStaffId] = useState(null);
  const staffUsers = users.filter((u) => u.role === "trainer" || u.role === "begeleider" || u.role === "specialist");

  return (
    <div className="p-4">
      <div className="font-bold text-slate-900 mb-1">Trainers, begeleiders &amp; specialisten</div>
      <div className="text-xs text-stone-400 mb-3">Tik op iemand om spelers aan hem/haar toe te kennen.</div>
      <div className="space-y-2">
        {staffUsers.map((u) => {
          const linkedCount = players.filter((p) => p.coachIds.includes(u.id)).length;
          const open = openStaffId === u.id;
          return (
            <div key={u.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              <button onClick={() => setOpenStaffId(open ? null : u.id)} className="w-full p-3 flex items-center justify-between text-left">
                <div>
                  <div className="font-semibold text-sm text-slate-900">{u.firstName} {u.lastName}</div>
                  <div className="text-xs text-stone-500">{roleDisplay(u)} · {linkedCount} speler(s)</div>
                </div>
                <ChevronRightIcon size={16} className={`text-stone-300 transition-transform ${open ? "rotate-90" : ""}`} />
              </button>
              {open && (
                <div className="border-t border-stone-100 p-3 space-y-1">
                  {players.map((p) => {
                    const linked = p.coachIds.includes(u.id);
                    return (
                      <label key={p.id} className="flex items-center justify-between text-sm py-1">
                        <span>{p.name}</span>
                        <input type="checkbox" checked={linked} onChange={() => onTogglePlayerCoach(u.id, p.id)} />
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spelers (staff view)
// ---------------------------------------------------------------------------

function SpelersScreen({ players, currentUser, alertLabelsByPlayer = {}, onOpen }) {
  const [q, setQ] = useState("");
  const filtered = players.filter(
    (p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.positions.join(" ").toLowerCase().includes(q.toLowerCase())
  );
  const linked = filtered.filter((p) => p.coachIds.includes(currentUser.id));
  const unlinked = filtered.filter((p) => !p.coachIds.includes(currentUser.id));

  return (
    <div className="p-4">
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-3 text-stone-400" />
        <input
          className="w-full border border-stone-300 rounded-lg pl-9 pr-3 py-2 text-sm bg-white"
          placeholder="Zoek op naam of positie"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <div className="font-bold text-slate-900 mb-2 text-sm">Gekoppelde spelers ({linked.length})</div>
        <div className="space-y-2">
          {linked.length === 0 && <div className="text-sm text-stone-400">Nog geen spelers aan jou gekoppeld.</div>}
          {linked.map((p) => (
            <PlayerRow key={p.id} p={p} alertLabels={alertLabelsByPlayer[p.id]} onOpen={onOpen} />
          ))}
        </div>
      </div>

      <div>
        <div className="font-bold text-slate-900 mb-2 text-sm">Niet-gekoppelde spelers ({unlinked.length})</div>
        <div className="space-y-2">
          {unlinked.length === 0 && <div className="text-sm text-stone-400">Geen overige spelers.</div>}
          {unlinked.map((p) => (
            <PlayerRow key={p.id} p={p} onOpen={onOpen} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PlayerRow({ p, alertLabels, onOpen }) {
  const hasAlert = !!alertLabels && alertLabels.length > 0;
  return (
    <button onClick={() => onOpen(p.id)} className="relative w-full bg-white rounded-xl p-3 border border-stone-200 flex items-center justify-between text-left">
      {hasAlert && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full" />}
      <div>
        <div className="font-semibold text-sm text-slate-900">{p.name}</div>
        {hasAlert && <div className="text-[11px] font-semibold text-rose-600">Aangepast naar rood: {alertLabels.join(", ")}</div>}
        <div className="flex flex-wrap gap-1 mt-1">
          {p.positions.map((pos) => <Badge key={pos}>{pos}</Badge>)}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1 text-base" title="Mood · Vermoeidheid · Fysieke toestand">
          <span>{MOOD_SCALE.find((s) => s.v === p.mood)?.emoji}</span>
          <span>{FATIGUE_SCALE.find((s) => s.v === p.fatigue)?.emoji}</span>
          <span>{CONDITION_SCALE.find((s) => s.v === p.physicalCondition)?.emoji}</span>
        </div>
        <ChevronRightIcon size={16} className="text-stone-300" />
      </div>
    </button>
  );
}

function SpelerDetailScreen({ player, users, logbook, trainings, canEdit, viewerRole, onBack, onAddLog, onToggleCoach, onTogglePosition, onUpdateCondition, onToggleModule, onUpdateTvs, onDeleteLog }) {
  const [showAddLog, setShowAddLog] = useState(false);
  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState(null);
  const canDeleteLog = viewerRole === "trainer" || viewerRole === "begeleider" || viewerRole === "specialist";
  const canSeeTvs = viewerRole === "trainer" || viewerRole === "specialist" || viewerRole === "coordinator";
  const tvs = player.tvs || {};
  const tvsType = tvsTypeLabel(tvs);
  const playerModules = Array.from(new Set([MODULE_ALWAYS_ON, ...(player.modules || [])]));
  const playerWeekProgram = player.weekProgram || [];
  const coaches = users.filter((u) => player.coachIds.includes(u.id));
  const staffUsers = users.filter((u) => u.role !== "speler");
  const canManageLinks = viewerRole !== "speler";
  const canEditPosition = viewerRole === "trainer" || viewerRole === "begeleider";
  const canEditCondition = viewerRole === "trainer" || viewerRole === "begeleider" || viewerRole === "specialist";

  return (
    <div className="p-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-stone-500 mb-3">
        <ArrowLeft size={16} /> Terug
      </button>

      <div className="bg-white rounded-xl p-4 border border-stone-200 mb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xl font-bold text-slate-900">{player.name}</div>
          {canEdit && <button className="text-xs text-orange-600 font-semibold">Bewerken</button>}
        </div>
        <div className="text-sm text-stone-500 mb-2">{player.city} · {new Date(player.dob).toLocaleDateString("nl-NL")}</div>

        <div className="mb-3">
          <div className="text-[10px] uppercase font-semibold text-stone-400 mb-1">Positie(s)</div>
          {canEditPosition ? (
            <div className="flex flex-wrap gap-1.5">
              {POSITION_OPTIONS.map((pos) => {
                const active = player.positions.includes(pos);
                return (
                  <button
                    key={pos}
                    onClick={() => onTogglePosition(pos)}
                    className={`text-[10px] uppercase font-semibold px-2 py-1 rounded-full border ${
                      active ? "bg-orange-600 text-white border-orange-600" : "bg-white text-stone-500 border-stone-300"
                    }`}
                  >
                    {pos}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {player.positions.map((pos) => <Badge key={pos}>{pos}</Badge>)}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <SmileyScale title="Mood" scale={MOOD_SCALE} value={player.mood} readOnly />
          <SmileyScale title="Vermoeidheid" scale={FATIGUE_SCALE} value={player.fatigue} readOnly />
          <SmileyScale
            title="Fysieke toestand"
            scale={CONDITION_SCALE}
            value={player.physicalCondition}
            readOnly={!canEditCondition}
            onChange={onUpdateCondition}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 border border-stone-200 mb-4">
        <div className="font-bold text-slate-900 mb-2 text-sm">Begeleiding</div>
        {canManageLinks ? (
          <div className="space-y-1">
            {staffUsers.map((u) => {
              const linked = player.coachIds.includes(u.id);
              return (
                <label key={u.id} className="flex items-center justify-between text-sm py-1">
                  <span>{u.firstName} {u.lastName} <span className="text-stone-400 text-xs">· {roleDisplay(u)}</span></span>
                  <input type="checkbox" checked={linked} onChange={() => onToggleCoach(u.id)} />
                </label>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {coaches.map((c) => (
              <div key={c.id} className="text-xs bg-stone-100 rounded-full px-2.5 py-1">{c.firstName} {c.lastName} · {roleDisplay(c)}</div>
            ))}
          </div>
        )}
      </div>

      {canSeeTvs && (
        <div className="bg-white rounded-xl p-4 border border-stone-200 mb-4">
          <div className="font-bold text-slate-900 mb-3 text-sm">Talent Volg Systeem</div>
          <div className="space-y-3">
            {[
              { key: "willen", label: "Willen" },
              { key: "kunnen", label: "Kunnen" },
            ].map((f) => (
              <div key={f.key}>
                <div className="text-xs font-semibold text-stone-500 mb-1">{f.label}</div>
                <div className="flex gap-1.5">
                  {TVS_LEVELS.map((n) => (
                    <button
                      key={n}
                      onClick={() => onUpdateTvs({ [f.key]: n })}
                      className={`flex-1 rounded-lg py-2 text-sm font-bold border ${
                        tvs[f.key] === n ? "bg-orange-600 text-white border-orange-600" : "bg-white text-stone-500 border-stone-300"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
              <span className="text-xs font-semibold text-stone-500">Type</span>
              <span className="text-sm font-bold text-orange-700">{tvsType || "Kies willen en kunnen"}</span>
            </div>

            <SmileyScale
              title="Ontwikkeling naar wens"
              scale={TVS_DEVELOPMENT_SCALE}
              value={tvs.development}
              emptyLabel="Nog niet ingevuld"
              onChange={(v) => onUpdateTvs({ development: v })}
            />

            <div>
              <div className="text-xs font-semibold text-stone-500 mb-1">Opmerking</div>
              <textarea
                value={tvs.note || ""}
                onChange={(e) => onUpdateTvs({ note: e.target.value })}
                rows={3}
                placeholder="Toelichting op de ontwikkeling van deze speler"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <button
              disabled={!tvsType}
              onClick={() => {
                const devLabel = TVS_DEVELOPMENT_SCALE.find((s) => s.v === tvs.development)?.label;
                const parts = [`Willen ${tvs.willen} · Kunnen ${tvs.kunnen}`];
                if (devLabel) parts.push(`Ontwikkeling: ${devLabel}`);
                if (tvs.note && tvs.note.trim()) parts.push(tvs.note.trim());
                onAddLog({
                  type: "overig",
                  title: `Talent Volg Systeem: ${tvsType}`,
                  note: parts.join("\n"),
                  score: tvs.development || undefined,
                  date: todayLocalISO(),
                });
              }}
              className={`w-full text-sm font-bold py-2.5 rounded-lg ${tvsType ? "bg-orange-600 text-white" : "bg-stone-100 text-stone-400"}`}
            >
              Toevoegen aan het spelers Logboek
            </button>
            {!tvsType && <div className="text-[11px] text-stone-400 -mt-1">Kies eerst willen en kunnen.</div>}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-4 border border-stone-200 mb-4">
        <div className="font-bold text-slate-900 mb-2 text-sm">Modules</div>
        <div className="flex flex-wrap gap-1.5">
          {MODULE_OPTIONS.map((m) => {
            const active = playerModules.includes(m);
            const locked = m === MODULE_ALWAYS_ON;
            return (
              <button
                key={m}
                onClick={() => onToggleModule(m)}
                disabled={locked}
                className={`text-[10px] uppercase font-semibold px-2 py-1 rounded-full border ${
                  active ? "bg-orange-600 text-white border-orange-600" : "bg-white text-stone-500 border-stone-300"
                } ${locked ? "cursor-default" : ""}`}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 border border-stone-200 mb-4">
        <div className="font-bold text-slate-900 mb-2 text-sm">Weekprogramma</div>
        {playerWeekProgram.length === 0 ? (
          <div className="text-sm text-stone-400">De speler heeft nog geen weekprogramma ingevuld.</div>
        ) : (
          <div className="space-y-2">
            {WEEK_DAYS.map((d) => {
              const entries = playerWeekProgram.filter((e) => e.day === d.key).sort((a, b) => a.start.localeCompare(b.start));
              if (entries.length === 0) return null;
              return (
                <div key={d.key}>
                  <div className="text-[10px] uppercase font-semibold text-stone-400 mb-1">{d.label}</div>
                  <div className="space-y-1">
                    {entries.map((e) => {
                      const kind = WEEK_ENTRY_KINDS.find((k) => k.key === e.kind) || WEEK_ENTRY_KINDS[2];
                      return (
                        <div key={e.id} className={`flex items-center gap-2 border rounded-lg px-2.5 py-1.5 text-sm ${kind.color}`}>
                          <span>{kind.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold">{e.start} – {e.end}</div>
                            <div className="text-xs opacity-80 truncate">{e.label || kind.label}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-4 border border-stone-200 mb-4">
        <div className="font-bold text-slate-900 mb-2 text-sm">Komende trainingen</div>
        {trainings.length === 0 && <div className="text-sm text-stone-400">Geen geplande trainingen.</div>}
        {trainings.map((t) => (
          <div key={t.id} className="text-sm py-1 flex justify-between">
            <span>{t.name}</span>
            <span className="text-stone-400">{fmtDate(t.date)}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-4 border border-stone-200">
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold text-slate-900 text-sm">Logboek</div>
          <button onClick={() => setShowAddLog(true)} className="text-orange-600 flex items-center gap-1 text-xs font-semibold">
            <Plus size={14} /> Nieuw
          </button>
        </div>
        <div className="space-y-2">
          {logbook.map((l) => (
            <div key={l.id} className={`border rounded-lg p-2 text-sm ${logScoreColor(l.score)}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold">{l.title}</div>
                {l.score && <span className="text-lg shrink-0">{TRAINING_FEEL_SCALE.find((s) => s.v === l.score)?.emoji}</span>}
              </div>
              {l.note && <div className="text-xs opacity-80 whitespace-pre-line">{l.note}</div>}
              <div className="text-[10px] opacity-70 mt-1 uppercase tracking-wide">{l.type}</div>
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] opacity-70">{l.date} · {l.author}</div>
                {canDeleteLog && confirmDeleteLogId !== l.id && (
                  <button onClick={() => setConfirmDeleteLogId(l.id)} className="opacity-60 p-1" aria-label="Logregel verwijderen">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {canDeleteLog && confirmDeleteLogId === l.id && (
                <div className="flex items-center justify-between gap-2 mt-1 pt-2 border-t border-black/10">
                  <span className="text-xs font-semibold">Deze logregel verwijderen?</span>
                  <div className="flex gap-1.5">
                    <button onClick={() => setConfirmDeleteLogId(null)} className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white/70 text-stone-700">
                      Nee
                    </button>
                    <button
                      onClick={() => { onDeleteLog(l.id); setConfirmDeleteLogId(null); }}
                      className="text-xs font-semibold px-2.5 py-1 rounded-md bg-rose-600 text-white"
                    >
                      Ja, verwijder
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showAddLog && (
        <AddLogModal
          onClose={() => setShowAddLog(false)}
          onSave={(entry) => {
            onAddLog(entry);
            setShowAddLog(false);
          }}
        />
      )}
    </div>
  );
}

function AddLogModal({ onClose, onSave }) {
  const [type, setType] = useState("overig");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-2xl p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="font-bold text-slate-900 mb-3">Logboekregel toevoegen</div>
        <select className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
          {Object.keys(LOG_TYPE_COLOR).map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-2 text-sm" placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-3 text-sm" placeholder="Notitie" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        <button
          onClick={() => title && onSave({ type, title, note, date: todayLocalISO() })}
          className="w-full bg-orange-600 text-white font-bold py-2.5 rounded-lg"
        >
          Opslaan
        </button>
      </div>
    </div>
  );
}

function Badge({ children, tone }) {
  const tones = { rose: "bg-rose-100 text-rose-700", orange: "bg-orange-100 text-orange-700", emerald: "bg-emerald-100 text-emerald-700" };
  return <span className={`text-[10px] uppercase font-semibold px-2 py-1 rounded-full ${tones[tone] || "bg-stone-100 text-stone-600"}`}>{children}</span>;
}

function Stat({ label, value }) {
  return (
    <div className="bg-stone-50 rounded-lg py-2">
      <div className="font-bold text-slate-900">{value}</div>
      <div className="text-[10px] text-stone-500">{label}</div>
    </div>
  );
}

// Herbruikbare 5-punts smiley-schaal (mood / vermoeidheid / fysieke toestand / trainingsgevoel).
function SmileyScale({ title, scale, value, onChange, readOnly, emptyLabel }) {
  const current = scale.find((s) => s.v === value) || scale[Math.floor(scale.length / 2)];
  const showEmpty = emptyLabel && !scale.some((s) => s.v === value);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-semibold text-stone-500">{title}</div>
        <div className="text-xs text-stone-400">{showEmpty ? emptyLabel : current.label}</div>
      </div>
      <div className="flex gap-1.5">
        {scale.map((s) => {
          const selected = value === s.v;
          return (
            <button
              key={s.v}
              disabled={readOnly}
              onClick={() => onChange && onChange(s.v)}
              className={`flex-1 rounded-lg py-2 text-xl border-2 ${SCORE_COLOR[s.v] || "bg-stone-100"} ${
                selected ? "border-slate-900" : "border-transparent opacity-50"
              }`}
            >
              {s.emoji}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Bepaalt of er nieuwe, nog niet geopende berichten in een trainingsgesprek staan.
function unreadChatCount(training, currentUserId, readCounts) {
  const chat = training.chat || [];
  if (chat.length === 0) return false;
  const last = chat[chat.length - 1];
  if (last.from === currentUserId) return false;
  return (readCounts[training.id] || 0) < chat.length;
}

function isInvolvedInTraining(training, userId, players) {
  const playerUserIds = training.playerIds.map((id) => players.find((p) => p.id === id)?.userId).filter(Boolean);
  return training.trainerIds.includes(userId) || playerUserIds.includes(userId);
}

// Een training is "nieuw" voor een gebruiker als hij tijdens deze sessie is aangemaakt door iemand anders,
// de gebruiker erbij betrokken is en de training nog niet geopend/bekeken is. De demo-trainingen
// waarmee de app start tellen niet als nieuw.
const INITIAL_TRAINING_IDS = new Set(initialTrainings.map((t) => t.id));
function isNewTrainingFor(training, userId, players, seenTrainingIds) {
  if (INITIAL_TRAINING_IDS.has(training.id)) return false;
  if (training.createdBy === userId) return false;
  if (!isInvolvedInTraining(training, userId, players)) return false;
  return !(seenTrainingIds[userId] || []).includes(training.id);
}

const PROGRESS_FIELD_LABEL = { mood: "Mood", fatigue: "Vermoeidheid", physicalCondition: "Fysieke toestand" };

// ---------------------------------------------------------------------------
// Trainingen (staff)
// ---------------------------------------------------------------------------

function TrainingenScreen({ trainings, players, users, currentUser, chatReadCounts, seenTrainingIds, weekAnchor, setWeekAnchor, onOpen, onCreate }) {
  const [showCreate, setShowCreate] = useState(false);
  const [filterMode, setFilterMode] = useState("mijn");
  const staffUsers = users.filter((u) => u.role !== "speler");
  const visibleTrainings = filterMode === "mijn" ? trainings.filter((t) => isInvolvedInTraining(t, currentUser.id, players)) : trainings;
  const weekDays = [...Array(7)].map((_, i) => {
    const d = new Date(weekAnchor);
    d.setDate(d.getDate() + i);
    return d;
  });
  const weekTrainings = visibleTrainings.filter((t) => weekDays.some((d) => toISODateLocal(d) === t.date));
  const sorted = visibleTrainings.slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  return (
    <div className="p-4">
      <div className="flex bg-stone-100 rounded-full p-1 mb-4">
        <button
          onClick={() => setFilterMode("mijn")}
          className={`flex-1 text-xs font-semibold py-1.5 rounded-full transition-colors ${filterMode === "mijn" ? "bg-white text-orange-600 shadow-sm" : "text-stone-500"}`}
        >
          Mijn trainingen
        </button>
        <button
          onClick={() => setFilterMode("alle")}
          className={`flex-1 text-xs font-semibold py-1.5 rounded-full transition-colors ${filterMode === "alle" ? "bg-white text-orange-600 shadow-sm" : "text-stone-500"}`}
        >
          Alle trainingen
        </button>
      </div>

      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setWeekAnchor((d) => { const nd = new Date(d); nd.setDate(nd.getDate() - 7); return nd; })}>
          <ChevronLeft size={18} />
        </button>
        <button onClick={() => setWeekAnchor(startOfWeek(new Date("2026-09-14")))} className="text-xs font-semibold text-orange-600">
          Vandaag
        </button>
        <button onClick={() => setWeekAnchor((d) => { const nd = new Date(d); nd.setDate(nd.getDate() + 7); return nd; })}>
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-4">
        {weekDays.map((d) => {
          const iso = toISODateLocal(d);
          const has = weekTrainings.some((t) => t.date === iso);
          return (
            <div key={iso} className={`text-center rounded-lg py-2 ${has ? "bg-orange-100" : "bg-white border border-stone-200"}`}>
              <div className="text-[10px] text-stone-500">{DAY_NAMES[d.getDay()]}</div>
              <div className="text-sm font-semibold text-slate-900">{d.getDate()}</div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-slate-900">{filterMode === "mijn" ? "Mijn trainingen" : "Alle trainingen"}</div>
        <button onClick={() => setShowCreate(true)} className="text-orange-600 flex items-center gap-1 text-xs font-semibold">
          <Plus size={14} /> Nieuw
        </button>
      </div>
      <div className="space-y-2">
        {sorted.length === 0 && (
          <div className="text-sm text-stone-400">
            {filterMode === "mijn" ? "Je bent bij geen enkele training ingedeeld." : "Nog geen trainingen gepland."}
          </div>
        )}
        {sorted.map((t) => {
          const counts = { aanwezig: 0, afwezig: 0, onbekend: 0 };
          t.playerIds.forEach((pid) => { counts[t.attendance[pid] || "onbekend"]++; });
          const unread =
            isNewTrainingFor(t, currentUser.id, players, seenTrainingIds) ||
            (isInvolvedInTraining(t, currentUser.id, players) && unreadChatCount(t, currentUser.id, chatReadCounts));
          return (
            <button key={t.id} onClick={() => onOpen(t.id)} className={`relative w-full bg-white rounded-xl p-3 border text-left ${t.cancelled ? "border-rose-200 opacity-70" : "border-stone-200"}`}>
              {unread && <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full" />}
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm text-slate-900">{t.name}</div>
                <span className={`text-[10px] uppercase font-semibold px-2 py-1 rounded-full mr-3 ${t.cancelled ? "bg-rose-100 text-rose-700" : "bg-orange-100 text-orange-700"}`}>
                  {t.cancelled ? "Geannuleerd" : t.type}
                </span>
              </div>
              <div className="text-xs text-stone-500 mb-1">{fmtDate(t.date)} · {t.time} · {t.location}</div>
              <div className="text-[11px] text-stone-500">✓ {counts.aanwezig} · ✕ {counts.afwezig} · ? {counts.onbekend}</div>
            </button>
          );
        })}
      </div>

      {showCreate && (
        <CreateTrainingModal
          players={players}
          staffUsers={staffUsers}
          onClose={() => setShowCreate(false)}
          onCreate={(t) => { onCreate(t); setShowCreate(false); }}
        />
      )}
    </div>
  );
}

function CreateTrainingModal({ players, staffUsers, onClose, onCreate }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", type: TRAINING_TYPE_OPTIONS[0], location: TRAINING_LOCATION_OPTIONS[0], date: "2026-09-15", time: "18:00", duration: 60, notes: "", recurrence: "eenmalig", weeks: 8 });
  const [selected, setSelected] = useState(players.map((p) => p.id));
  const [selectedTrainers, setSelectedTrainers] = useState([]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-2xl p-4 w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <div className="font-bold text-slate-900">Nieuwe training</div>
          <div className="text-xs text-stone-400">Stap {step} van 2</div>
        </div>
        <div className="text-xs font-semibold text-orange-600 mb-3">{step === 1 ? "Planning" : "Voor wie"}</div>

        {step === 1 && (
          <>
            <input className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-2 text-sm" placeholder="Naam" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div className="flex gap-2 mb-2">
              <select className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TRAINING_TYPE_OPTIONS.map((t) => <option key={t}>{t}</option>)}
              </select>
              <select className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}>
                {TRAINING_LOCATION_OPTIONS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div className="flex gap-2 mb-2">
              <input type="date" className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              <input type="time" className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </div>
            <input type="number" className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-2 text-sm" placeholder="Duur (min)" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} />
            <textarea className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-3 text-sm" placeholder="Notities" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

            <div className="text-xs font-semibold text-stone-500 mb-1">Herhaling</div>
            <div className="flex gap-2 mb-4">
              <select className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm" value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value })}>
                <option value="eenmalig">Eenmalig</option>
                <option value="wekelijks">Wekelijks</option>
              </select>
              {form.recurrence === "wekelijks" && (
                <input
                  type="number"
                  min={2}
                  max={26}
                  className="w-20 border border-stone-300 rounded-lg px-2 py-2 text-sm"
                  value={form.weeks}
                  onChange={(e) => setForm({ ...form, weeks: Number(e.target.value) })}
                  title="Aantal weken"
                />
              )}
            </div>

            <button
              onClick={() => form.name && setStep(2)}
              className="w-full bg-orange-600 text-white font-bold py-2.5 rounded-lg"
            >
              Volgende: voor wie
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="text-xs font-semibold text-stone-500 mb-1">Trainer(s) / begeleiding</div>
            <div className="space-y-1 mb-3">
              {staffUsers.map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={selectedTrainers.includes(u.id)} onChange={(e) => setSelectedTrainers(e.target.checked ? [...selectedTrainers, u.id] : selectedTrainers.filter((id) => id !== u.id))} />
                  {u.firstName} {u.lastName} <span className="text-stone-400 text-xs">· {roleDisplay(u)}</span>
                </label>
              ))}
            </div>

            <div className="text-xs font-semibold text-stone-500 mb-1">Deelnemers</div>
            <div className="space-y-1 mb-4">
              {players.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={selected.includes(p.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, p.id] : selected.filter((id) => id !== p.id))} />
                  {p.name}
                </label>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 bg-stone-100 text-stone-600 font-semibold py-2.5 rounded-lg">
                Terug
              </button>
              <button
                onClick={() => onCreate({ ...form, trainerIds: selectedTrainers, playerIds: selected })}
                className="flex-1 bg-orange-600 text-white font-bold py-2.5 rounded-lg"
              >
                Plannen
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TrainingDetailScreen({ training, players, users, currentUser, onBack, onSetAttendance, onDelete, onSendMessage, onUpdateTraining, onCancelTraining }) {
  const [showEdit, setShowEdit] = useState(false);
  const [editScope, setEditScope] = useState("instance");
  const [showCancel, setShowCancel] = useState(false);
  const parts = training.playerIds.map((id) => players.find((p) => p.id === id)).filter(Boolean);
  const trainerUsers = training.trainerIds.map((id) => users.find((u) => u.id === id)).filter(Boolean);
  const staffUsers = users.filter((u) => u.role !== "speler");
  const counts = { aanwezig: 0, afwezig: 0, onbekend: 0 };
  training.playerIds.forEach((pid) => { counts[training.attendance[pid] || "onbekend"]++; });
  const involvedIds = [...training.trainerIds, ...parts.map((p) => p.userId)];
  const isInvolved = involvedIds.includes(currentUser.id);

  return (
    <div className="p-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-stone-500 mb-3">
        <ArrowLeft size={16} /> Terug
      </button>
      <div className="bg-white rounded-xl p-4 border border-stone-200 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-xl font-bold text-slate-900">{training.name}</div>
          {training.cancelled && <span className="text-[10px] uppercase font-semibold text-rose-700 bg-rose-100 px-2 py-1 rounded-full">Geannuleerd</span>}
        </div>
        <div className="text-sm text-stone-500 mb-2">{fmtDate(training.date)} · {training.time} · {training.duration} min · {training.location}{training.seriesId ? " · wekelijks" : ""}</div>
        {training.notes && <div className="text-sm text-stone-600 mb-2">{training.notes}</div>}
        {trainerUsers.length > 0 && (
          <div className="text-xs text-stone-500 mb-2">Trainer(s): {trainerUsers.map((u) => `${u.firstName} ${u.lastName}`).join(", ")}</div>
        )}
        <div className="text-xs text-stone-500 mb-3">✓ {counts.aanwezig} aanwezig · ✕ {counts.afwezig} afwezig · ? {counts.onbekend} onbekend</div>
        <div className="flex gap-2 mb-2">
          <button onClick={() => { setEditScope("instance"); setShowEdit(true); }} className="flex-1 bg-orange-50 text-orange-700 text-sm font-semibold py-2 rounded-lg">
            Bewerken
          </button>
          {training.seriesId && (
            <button onClick={() => { setEditScope("series"); setShowEdit(true); }} className="flex-1 bg-orange-50 text-orange-700 text-sm font-semibold py-2 rounded-lg">
              Serie bewerken
            </button>
          )}
        </div>
        {!training.cancelled && (
          <button onClick={() => setShowCancel(true)} className="w-full bg-rose-100 text-rose-700 text-sm font-semibold py-2 rounded-lg mb-2">
            Annuleren
          </button>
        )}
        <button onClick={onDelete} className="w-full bg-stone-100 text-stone-600 text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-1">
          <Trash2 size={16} /> Training verwijderen
        </button>
      </div>

      <div className="bg-white rounded-xl p-4 border border-stone-200">
        <div className="font-bold text-slate-900 mb-2 text-sm">Aanwezigheid registreren</div>
        {isPastTraining(training) && (
          <div className="text-xs text-stone-400 mb-2">Deze training is al geweest — aanwezigheid kan niet meer aangepast worden.</div>
        )}
        <div className="space-y-2">
          {parts.map((p) => {
            const status = training.attendance[p.id] || "onbekend";
            const locked = isPastTraining(training);
            return (
              <div key={p.id} className="flex items-center justify-between">
                <span className="text-sm text-slate-900">{p.name}</span>
                {locked ? (
                  <span className={`text-[10px] uppercase font-semibold px-2 py-1 rounded-full ${
                    status === "aanwezig" ? "bg-emerald-100 text-emerald-700" : status === "afwezig" ? "bg-rose-100 text-rose-700" : "bg-stone-100 text-stone-500"
                  }`}>{status}</span>
                ) : (
                  <div className="flex gap-1">
                    <button onClick={() => onSetAttendance(p.id, "aanwezig")} className={`p-1.5 rounded-lg ${status === "aanwezig" ? "bg-emerald-500 text-white" : "bg-stone-100 text-stone-400"}`}>
                      <UserCheck size={15} />
                    </button>
                    <button onClick={() => onSetAttendance(p.id, "afwezig")} className={`p-1.5 rounded-lg ${status === "afwezig" ? "bg-rose-500 text-white" : "bg-stone-100 text-stone-400"}`}>
                      <UserX size={15} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isInvolved ? (
        <TrainingChat training={training} users={users} currentUser={currentUser} onSend={onSendMessage} />
      ) : (
        <div className="text-xs text-stone-400 text-center mt-4">Alleen betrokkenen bij deze training zien het gesprek erover.</div>
      )}

      {showEdit && (
        <EditTrainingModal
          training={training}
          players={players}
          staffUsers={staffUsers}
          scope={editScope}
          onClose={() => setShowEdit(false)}
          onSave={(changes) => { onUpdateTraining(changes, editScope); setShowEdit(false); }}
        />
      )}
      {showCancel && (
        <CancelTrainingModal
          training={training}
          onClose={() => setShowCancel(false)}
          onConfirm={(scope, message) => { onCancelTraining(scope, message); setShowCancel(false); }}
        />
      )}
    </div>
  );
}

function EditTrainingModal({ training, players, staffUsers, scope, onClose, onSave }) {
  const [form, setForm] = useState({ name: training.name, type: training.type, location: training.location || TRAINING_LOCATION_OPTIONS[0], date: training.date, time: training.time, duration: training.duration, notes: training.notes || "" });
  const [selected, setSelected] = useState(training.playerIds);
  const [selectedTrainers, setSelectedTrainers] = useState(training.trainerIds);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-2xl p-4 w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="font-bold text-slate-900 mb-1">{scope === "series" ? "Hele serie bewerken" : "Training bewerken"}</div>
        {scope === "series" && <div className="text-xs text-stone-400 mb-3">De datum van elke training in de reeks blijft ongewijzigd.</div>}

        <input className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-2 text-sm" placeholder="Naam" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="flex gap-2 mb-2">
          <select className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {TRAINING_TYPE_OPTIONS.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}>
            {TRAINING_LOCATION_OPTIONS.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div className="flex gap-2 mb-2">
          <input
            type="date"
            disabled={scope === "series"}
            className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm disabled:bg-stone-100 disabled:text-stone-400"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <input type="time" className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
        </div>
        <input type="number" className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-2 text-sm" placeholder="Duur (min)" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} />
        <textarea className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-3 text-sm" placeholder="Notities" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

        <div className="text-xs font-semibold text-stone-500 mb-1">Trainer(s) / begeleiding</div>
        <div className="space-y-1 mb-3">
          {staffUsers.map((u) => (
            <label key={u.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selectedTrainers.includes(u.id)} onChange={(e) => setSelectedTrainers(e.target.checked ? [...selectedTrainers, u.id] : selectedTrainers.filter((id) => id !== u.id))} />
              {u.firstName} {u.lastName} <span className="text-stone-400 text-xs">· {roleDisplay(u)}</span>
            </label>
          ))}
        </div>

        <div className="text-xs font-semibold text-stone-500 mb-1">Deelnemers</div>
        <div className="space-y-1 mb-3">
          {players.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selected.includes(p.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, p.id] : selected.filter((id) => id !== p.id))} />
              {p.name}
            </label>
          ))}
        </div>

        <button
          onClick={() => form.name && onSave({ name: form.name, type: form.type, location: form.location, date: form.date, time: form.time, duration: form.duration, notes: form.notes, trainerIds: selectedTrainers, playerIds: selected })}
          className="w-full bg-orange-600 text-white font-bold py-2.5 rounded-lg"
        >
          Opslaan
        </button>
      </div>
    </div>
  );
}

function CancelTrainingModal({ training, onClose, onConfirm }) {
  const [scope, setScope] = useState("instance");
  const [message, setMessage] = useState("Deze training is geannuleerd.");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-2xl p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="font-bold text-slate-900 mb-1">Training annuleren</div>
        <div className="text-xs text-stone-500 mb-3">Alle deelnemers krijgen hierover automatisch een bericht in het trainingsgesprek.</div>

        {training.seriesId && (
          <div className="mb-3">
            <div className="text-xs font-semibold text-stone-500 mb-1">Toepassen op</div>
            <div className="flex gap-2">
              <button
                onClick={() => setScope("instance")}
                className={`flex-1 text-xs font-semibold py-2 rounded-lg border ${scope === "instance" ? "bg-rose-600 text-white border-rose-600" : "bg-white text-stone-600 border-stone-300"}`}
              >
                Alleen deze training
              </button>
              <button
                onClick={() => setScope("series")}
                className={`flex-1 text-xs font-semibold py-2 rounded-lg border ${scope === "series" ? "bg-rose-600 text-white border-rose-600" : "bg-white text-stone-600 border-stone-300"}`}
              >
                Hele reeks
              </button>
            </div>
          </div>
        )}

        <textarea className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-3 text-sm" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />

        <button onClick={() => onConfirm(scope, message)} className="w-full bg-rose-600 text-white font-bold py-2.5 rounded-lg">
          Annuleren bevestigen
        </button>
      </div>
    </div>
  );
}

// Persoonlijk gesprek per training — enkel zichtbaar/beantwoordbaar voor betrokken
// trainers/begeleiders/specialisten en de deelnemende spelers.
function TrainingChat({ training, users, currentUser, onSend }) {
  const [text, setText] = useState("");
  const nameFor = (id) => {
    const u = users.find((x) => x.id === id);
    return u ? `${u.firstName} ${u.lastName}` : "?";
  };
  return (
    <div className="bg-white rounded-xl p-4 border border-stone-200 mt-4">
      <div className="font-bold text-slate-900 mb-2 text-sm flex items-center gap-1">
        <MessageSquare size={14} /> Gesprek over deze training
      </div>
      <div className="space-y-2 max-h-56 overflow-y-auto mb-3">
        {(training.chat || []).length === 0 && <div className="text-xs text-stone-400">Nog geen berichten.</div>}
        {(training.chat || []).map((m, i) => (
          <div key={i} className={`text-sm ${m.from === currentUser.id ? "text-right" : ""}`}>
            <div className={`inline-block rounded-xl px-3 py-1.5 max-w-[85%] text-left ${m.from === currentUser.id ? "bg-orange-600 text-white" : "bg-stone-100 text-slate-900"}`}>
              {m.from !== currentUser.id && <div className="text-[10px] font-semibold opacity-60">{nameFor(m.from)}</div>}
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border border-stone-300 rounded-full px-3 py-1.5 text-sm"
          placeholder="Typ een bericht..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && text) { onSend(text); setText(""); } }}
        />
        <button onClick={() => { if (text) { onSend(text); setText(""); } }} className="bg-orange-600 text-white w-8 h-8 rounded-full flex items-center justify-center shrink-0">
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Speler: eigen schema (training week) + attendance
// ---------------------------------------------------------------------------

function SpelerEigenScreen({ player, trainings, users, currentUser, chatReadCounts, seenTrainingIds = {}, onOpenChat, onSetOwnAttendance, onSendTrainingMessage, onLogTraining }) {
  const [openChatFor, setOpenChatFor] = useState(null);
  const [logForTraining, setLogForTraining] = useState(null);
  const sorted = trainings.slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return (
    <div className="p-4">
      <div className="font-bold text-slate-900 mb-3">Jouw trainingen</div>
      <div className="space-y-2">
        {sorted.map((t) => {
          const status = t.attendance[player.id] || "onbekend";
          const unread = unreadChatCount(t, currentUser.id, chatReadCounts);
          const isNew = isNewTrainingFor(t, currentUser.id, [player], seenTrainingIds);
          return (
            <div key={t.id} className={`bg-white rounded-xl p-3 border ${t.cancelled ? "border-rose-200 opacity-70" : "border-stone-200"}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                  {isNew && <span className="w-2.5 h-2.5 bg-rose-500 rounded-full shrink-0" title="Nieuwe training" />}
                  {t.name}
                </div>
                <span className={`text-[10px] uppercase font-semibold px-2 py-1 rounded-full ${t.cancelled ? "bg-rose-100 text-rose-700" : "bg-orange-100 text-orange-700"}`}>
                  {t.cancelled ? "Geannuleerd" : t.type}
                </span>
              </div>
              <div className="text-xs text-stone-500 mb-2">{fmtDate(t.date)} · {t.time} · {t.location}{t.seriesId ? " · wekelijks" : ""}</div>
              {isPastTraining(t) ? (
                <div className={`text-xs font-semibold mb-2 ${status === "aanwezig" ? "text-emerald-700" : status === "afwezig" ? "text-rose-700" : "text-stone-400"}`}>
                  {status === "onbekend" ? "Geen aanwezigheid opgegeven" : `Je gaf aan: ${status}`} <span className="text-stone-400 font-normal">· niet meer aan te passen</span>
                </div>
              ) : (
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => onSetOwnAttendance(t.id, "aanwezig")}
                    className={`flex-1 text-xs font-semibold py-1.5 rounded-lg ${status === "aanwezig" ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-500"}`}
                  >
                    Ja, ik ben aanwezig
                  </button>
                  <button
                    onClick={() => onSetOwnAttendance(t.id, "afwezig")}
                    className={`flex-1 text-xs font-semibold py-1.5 rounded-lg ${status === "afwezig" ? "bg-rose-500 text-white" : "bg-stone-100 text-stone-500"}`}
                  >
                    Ik ben afwezig
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const opening = openChatFor !== t.id;
                    setOpenChatFor(opening ? t.id : null);
                    if (opening) onOpenChat(t.id);
                  }}
                  className="relative flex-1 bg-stone-100 text-slate-700 text-xs font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1"
                >
                  {unread && <span className="absolute top-0.5 right-6 w-2 h-2 bg-rose-500 rounded-full" />}
                  <MessageSquare size={13} /> Gesprek
                </button>
                <button onClick={() => setLogForTraining(t.id)} className="flex-1 bg-stone-100 text-slate-700 text-xs font-semibold py-1.5 rounded-lg">
                  Training loggen
                </button>
              </div>
              {openChatFor === t.id && (
                <TrainingChat training={t} users={users} currentUser={currentUser} onSend={(text) => onSendTrainingMessage(t.id, text)} />
              )}
            </div>
          );
        })}
      </div>

      {logForTraining && (
        <TrainingLogModal
          training={sorted.find((t) => t.id === logForTraining)}
          onClose={() => setLogForTraining(null)}
          onSave={(mood, note) => { onLogTraining(logForTraining, mood, note); setLogForTraining(null); }}
        />
      )}
    </div>
  );
}

function TrainingLogModal({ training, onClose, onSave }) {
  const [mood, setMood] = useState(null);
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-2xl p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="font-bold text-slate-900 mb-1">Training loggen</div>
        <div className="text-sm text-stone-500 mb-3">{training?.name}</div>
        <div className="mb-3">
          <SmileyScale title="Hoe ging het?" scale={TRAINING_FEEL_SCALE} value={mood} onChange={setMood} />
        </div>
        <textarea className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-3 text-sm" placeholder="Notitie" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        <button onClick={() => mood && onSave(mood, note)} className="w-full bg-orange-600 text-white font-bold py-2.5 rounded-lg">
          Opslaan
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Voortgang (speler)
// ---------------------------------------------------------------------------

function VoortgangScreen({ player, logbook, onUpdate }) {
  if (!player) return <div className="p-4 text-sm text-stone-400">Geen spelersprofiel gekoppeld.</div>;
  return (
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-xl p-4 border border-stone-200 space-y-4">
        <SmileyScale title="Mood" scale={MOOD_SCALE} value={player.mood} onChange={(v) => onUpdate("mood", v)} />
        <SmileyScale title="Vermoeidheid" scale={FATIGUE_SCALE} value={player.fatigue} onChange={(v) => onUpdate("fatigue", v)} />
        <SmileyScale title="Fysieke toestand" scale={CONDITION_SCALE} value={player.physicalCondition} onChange={(v) => onUpdate("physicalCondition", v)} />
      </div>
      <div>
        <div className="font-bold text-slate-900 mb-2">Jouw logboek</div>
        <div className="space-y-2">
          {logbook.map((l) => (
            <div key={l.id} className={`border rounded-lg p-2 text-sm ${logScoreColor(l.score)}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold">{l.title}</div>
                {l.score && <span className="text-lg shrink-0">{TRAINING_FEEL_SCALE.find((s) => s.v === l.score)?.emoji}</span>}
              </div>
              {l.note && <div className="text-xs opacity-80">{l.note}</div>}
              <div className="text-[10px] opacity-70 mt-1 uppercase tracking-wide">{l.type}</div>
              <div className="text-[10px] opacity-70">{l.date}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modules + weekprogramma — speler
// ---------------------------------------------------------------------------

function ModulesScreen({ player, onUpdate }) {
  const [addingDay, setAddingDay] = useState(null);
  const [form, setForm] = useState({ kind: "school", start: "08:30", end: "15:30", label: "" });

  if (!player) return <div className="p-4 text-sm text-stone-400">Geen spelersprofiel gekoppeld.</div>;

  const modules = Array.from(new Set([MODULE_ALWAYS_ON, ...(player.modules || [])]));
  const weekProgram = player.weekProgram || [];

  const toggleModule = (m) => {
    if (m === MODULE_ALWAYS_ON) return;
    onUpdate("modules", modules.includes(m) ? modules.filter((x) => x !== m) : [...modules, m]);
  };

  const openAdd = (day) => {
    setAddingDay(day);
    setForm({ kind: "school", start: "08:30", end: "15:30", label: "" });
  };

  const saveEntry = () => {
    if (!form.start || !form.end || form.end <= form.start) return;
    onUpdate("weekProgram", [...weekProgram, { id: "w" + Date.now(), day: addingDay, ...form, label: form.label.trim() }]);
    setAddingDay(null);
  };

  const removeEntry = (id) => onUpdate("weekProgram", weekProgram.filter((e) => e.id !== id));
  const formInvalid = !form.start || !form.end || form.end <= form.start;

  return (
    <div className="p-4 space-y-6">
      <div>
        <div className="font-bold text-slate-900 mb-1">Mijn modules</div>
        <div className="text-xs text-stone-500 mb-3">Kies welke modules je volgt. Basis volg je altijd.</div>
        <div className="space-y-2">
          {MODULE_OPTIONS.map((m) => {
            const on = modules.includes(m);
            const locked = m === MODULE_ALWAYS_ON;
            return (
              <button
                key={m}
                onClick={() => toggleModule(m)}
                disabled={locked}
                className={`w-full flex items-center gap-3 rounded-xl p-3 border text-left ${on ? "bg-orange-50 border-orange-300" : "bg-white border-stone-200"} ${locked ? "cursor-default" : ""}`}
              >
                <span className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${on ? "bg-orange-600 border-orange-600 text-white" : "border-stone-300 bg-white"}`}>
                  {on && <Check size={14} />}
                </span>
                <span className="flex-1 text-sm font-semibold text-slate-900">{m}</span>
                {locked && <span className="text-[10px] uppercase font-semibold text-orange-700 bg-orange-100 px-2 py-1 rounded-full">Altijd</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="font-bold text-slate-900 mb-1">Mijn weekprogramma</div>
        <div className="text-xs text-stone-500 mb-3">Vul je schooltijden en de tijden van al je trainingen in.</div>
        <div className="space-y-3">
          {WEEK_DAYS.map((d) => {
            const entries = weekProgram.filter((e) => e.day === d.key).sort((a, b) => a.start.localeCompare(b.start));
            const isAdding = addingDay === d.key;
            return (
              <div key={d.key} className="bg-white rounded-xl border border-stone-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-sm text-slate-900">{d.label}</div>
                  {!isAdding && (
                    <button onClick={() => openAdd(d.key)} className="text-orange-600 flex items-center gap-1 text-xs font-semibold">
                      <Plus size={14} /> Toevoegen
                    </button>
                  )}
                </div>

                {entries.length === 0 && !isAdding && <div className="text-xs text-stone-400">Nog niets ingevuld.</div>}

                <div className="space-y-1.5">
                  {entries.map((e) => {
                    const kind = WEEK_ENTRY_KINDS.find((k) => k.key === e.kind) || WEEK_ENTRY_KINDS[2];
                    return (
                      <div key={e.id} className={`flex items-center gap-2 border rounded-lg px-2.5 py-1.5 text-sm ${kind.color}`}>
                        <span>{kind.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold">{e.start} – {e.end}</div>
                          <div className="text-xs opacity-80 truncate">{e.label || kind.label}</div>
                        </div>
                        <button onClick={() => removeEntry(e.id)} className="opacity-60 p-1" aria-label="Verwijderen">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {isAdding && (
                  <div className="mt-2 border-t border-stone-100 pt-3 space-y-3">
                    <div className="flex gap-1.5">
                      {WEEK_ENTRY_KINDS.map((k) => (
                        <button
                          key={k.key}
                          onClick={() => setForm((f) => ({ ...f, kind: k.key }))}
                          className={`flex-1 text-xs font-semibold py-1.5 rounded-full border ${form.kind === k.key ? "bg-orange-600 border-orange-600 text-white" : "bg-white border-stone-200 text-stone-600"}`}
                        >
                          {k.emoji} {k.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <label className="flex-1 text-[11px] text-stone-500">
                        Van
                        <input type="time" value={form.start} onChange={(ev) => setForm((f) => ({ ...f, start: ev.target.value }))} className="mt-1 w-full border border-stone-200 rounded-lg px-2 py-1.5 text-sm text-slate-900" />
                      </label>
                      <label className="flex-1 text-[11px] text-stone-500">
                        Tot
                        <input type="time" value={form.end} onChange={(ev) => setForm((f) => ({ ...f, end: ev.target.value }))} className="mt-1 w-full border border-stone-200 rounded-lg px-2 py-1.5 text-sm text-slate-900" />
                      </label>
                    </div>
                    <input
                      value={form.label}
                      onChange={(ev) => setForm((f) => ({ ...f, label: ev.target.value }))}
                      placeholder={form.kind === "training" ? "Bijv. Training Opperdam" : "Omschrijving (optioneel)"}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                    />
                    {formInvalid && form.start && form.end && <div className="text-[11px] text-rose-600">De eindtijd moet na de starttijd liggen.</div>}
                    <div className="flex gap-2">
                      <button onClick={() => setAddingDay(null)} className="flex-1 text-sm font-semibold py-2 rounded-lg border border-stone-200 text-stone-600">Annuleren</button>
                      <button onClick={saveEntry} disabled={formInvalid} className={`flex-1 text-sm font-semibold py-2 rounded-lg text-white ${formInvalid ? "bg-orange-300" : "bg-orange-600"}`}>Opslaan</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Schema's — specialist
// ---------------------------------------------------------------------------

function SpecialistSchemasScreen({ schemas, players, onOpen, onCreate }) {
  const [showCreate, setShowCreate] = useState(false);
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-slate-900">Jouw schema's</div>
        <button onClick={() => setShowCreate(true)} className="text-orange-600 flex items-center gap-1 text-xs font-semibold">
          <Plus size={14} /> Nieuw
        </button>
      </div>
      <div className="space-y-2">
        {schemas.map((s) => {
          const Icon = SCHEMA_TYPE_ICON[s.type];
          const names = s.playerIds.map((id) => players.find((p) => p.id === id)?.name).filter(Boolean).join(", ");
          const expired = isSchemaExpired(s);
          return (
            <button key={s.id} onClick={() => onOpen(s.id)} className={`w-full bg-white rounded-xl p-3 border flex items-center gap-3 text-left ${expired ? "border-rose-200 opacity-70" : "border-stone-200"}`}>
              <div className="bg-orange-100 text-orange-700 rounded-lg p-2"><Icon size={18} /></div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-slate-900">{s.name}</div>
                <div className="text-xs text-stone-500">{names} · {s.items.length} onderdelen</div>
              </div>
              {expired && <span className="text-[10px] uppercase font-semibold text-rose-700 bg-rose-100 px-2 py-1 rounded-full shrink-0">Verlopen</span>}
              <ChevronRightIcon size={16} className="text-stone-300 shrink-0" />
            </button>
          );
        })}
      </div>

      {showCreate && (
        <SchemaFormModal
          title="Nieuw schema"
          submitLabel="Schema opslaan"
          players={players}
          onClose={() => setShowCreate(false)}
          onSubmit={(s) => { onCreate(s); setShowCreate(false); }}
        />
      )}
    </div>
  );
}

function SchemaFormModal({ title, submitLabel, players, initial, onClose, onSubmit }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: initial?.name || "",
    type: initial?.type || "kracht",
    description: initial?.description || "",
    endDate: initial?.endDate || "",
  });
  const [items, setItems] = useState(initial?.items?.length ? initial.items : [{ id: "n1", label: "", unit: "", target: "" }]);
  const [selectedPlayers, setSelectedPlayers] = useState(initial?.playerIds || []);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-2xl p-4 w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <div className="font-bold text-slate-900">{title}</div>
          <div className="text-xs text-stone-400">Stap {step} van 2</div>
        </div>
        <div className="text-xs font-semibold text-orange-600 mb-3">{step === 1 ? "Schema" : "Voor wie"}</div>

        {step === 1 && (
          <>
            <input className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-2 text-sm" placeholder="Naam" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.keys(SCHEMA_TYPE_ICON).map((t) => <option key={t} value={t}>{SCHEMA_TYPE_LABEL[t]}</option>)}
            </select>

            <textarea className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-2 text-sm" placeholder="Beschrijving" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

            <div className="text-xs font-semibold text-stone-500 mb-1">Einddatum (optioneel)</div>
            <input type="date" className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-3 text-sm" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />

            <div className="text-xs font-semibold text-stone-500 mb-1">Onderdelen</div>
            <div className="space-y-2 mb-2">
              {items.map((it, idx) => (
                <div key={it.id} className="flex gap-1">
                  <input className="flex-1 border border-stone-300 rounded-lg px-2 py-1.5 text-sm" placeholder="Label" value={it.label} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, label: e.target.value } : x))} />
                  <input className="w-16 border border-stone-300 rounded-lg px-2 py-1.5 text-sm" placeholder="Eenheid" value={it.unit} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, unit: e.target.value } : x))} />
                  <input className="w-16 border border-stone-300 rounded-lg px-2 py-1.5 text-sm" placeholder="Doel" value={it.target} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, target: e.target.value } : x))} />
                </div>
              ))}
            </div>
            <button onClick={() => setItems([...items, { id: "n" + Date.now(), label: "", unit: "", target: "" }])} className="text-xs text-orange-600 font-semibold mb-4 flex items-center gap-1">
              <Plus size={12} /> Onderdeel toevoegen
            </button>

            <button
              onClick={() => form.name && setStep(2)}
              className="w-full bg-orange-600 text-white font-bold py-2.5 rounded-lg"
            >
              Volgende: voor wie
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="text-xs font-semibold text-stone-500 mb-1">Voor wie</div>
            <div className="space-y-1 mb-4 max-h-64 overflow-y-auto">
              {players.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedPlayers.includes(p.id)}
                    onChange={(e) => setSelectedPlayers(e.target.checked ? [...selectedPlayers, p.id] : selectedPlayers.filter((id) => id !== p.id))}
                  />
                  {p.name}
                </label>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 bg-stone-100 text-stone-600 font-semibold py-2.5 rounded-lg">
                Terug
              </button>
              <button
                onClick={() => selectedPlayers.length > 0 && onSubmit({ ...form, playerIds: selectedPlayers, items: items.filter((i) => i.label) })}
                className="flex-1 bg-orange-600 text-white font-bold py-2.5 rounded-lg"
              >
                {submitLabel}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SchemaDetailScreen({ schema, players, onBack, onDelete, onUpdate }) {
  const [showEdit, setShowEdit] = useState(false);
  const names = schema.playerIds.map((id) => players.find((p) => p.id === id)?.name).filter(Boolean);
  const Icon = SCHEMA_TYPE_ICON[schema.type];
  const expired = isSchemaExpired(schema);
  return (
    <div className="p-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-stone-500 mb-3">
        <ArrowLeft size={16} /> Terug
      </button>
      <div className="bg-white rounded-xl p-4 border border-stone-200 mb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-orange-100 text-orange-700 rounded-lg p-2 shrink-0"><Icon size={20} /></div>
          <div className="flex-1">
            <div className="text-xl font-bold text-slate-900">{schema.name}</div>
            <div className="text-sm text-stone-500">{SCHEMA_TYPE_LABEL[schema.type]}</div>
          </div>
          {expired && <span className="text-[10px] uppercase font-semibold text-rose-700 bg-rose-100 px-2 py-1 rounded-full shrink-0">Verlopen</span>}
        </div>
        <div className="text-sm text-stone-500 mb-2">Voor {names.join(", ") || "—"}</div>
        {schema.endDate && (
          <div className="text-xs text-stone-400 mb-2">Einddatum: {new Date(schema.endDate).toLocaleDateString("nl-NL")}</div>
        )}
        <p className="text-sm text-stone-600 mb-3">{schema.description}</p>
        <button onClick={() => setShowEdit(true)} className="w-full bg-orange-50 text-orange-700 text-sm font-semibold py-2 rounded-lg">
          Bewerken
        </button>
      </div>
      <div className="bg-white rounded-xl p-4 border border-stone-200 mb-4">
        <div className="font-bold text-slate-900 mb-2 text-sm">Onderdelen</div>
        <div className="space-y-2">
          {schema.items.map((it) => (
            <div key={it.id} className="flex justify-between text-sm border-b border-stone-100 pb-1">
              <span>{it.label}</span>
              <span className="text-stone-500">{it.target}{it.unit ? " " + it.unit : ""}</span>
            </div>
          ))}
        </div>
      </div>
      <button onClick={onDelete} className="w-full bg-rose-100 text-rose-700 font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2">
        <Trash2 size={16} /> Schema verwijderen
      </button>

      {showEdit && (
        <SchemaFormModal
          title="Schema bewerken"
          submitLabel="Wijzigingen opslaan"
          players={players}
          initial={schema}
          onClose={() => setShowEdit(false)}
          onSubmit={(changes) => { onUpdate(changes); setShowEdit(false); }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Schema's — speler
// ---------------------------------------------------------------------------

function SpelerSchemasScreen({ schemas, seenSchemaIds, onOpen }) {
  return (
    <div className="p-4">
      <div className="font-bold text-slate-900 mb-3">Jouw schema's</div>
      <div className="space-y-2">
        {schemas.length === 0 && <div className="text-sm text-stone-400">Nog geen schema's gekoppeld.</div>}
        {schemas.map((s) => {
          const Icon = SCHEMA_TYPE_ICON[s.type];
          const expired = isSchemaExpired(s);
          const unread = !seenSchemaIds.includes(s.id);
          return (
            <button key={s.id} onClick={() => onOpen(s.id)} className={`relative w-full bg-white rounded-xl p-3 border flex items-center gap-3 text-left ${expired ? "border-rose-200 opacity-70" : "border-stone-200"}`}>
              {unread && <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full" />}
              <div className="bg-orange-100 text-orange-700 rounded-lg p-2"><Icon size={18} /></div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-slate-900">{s.name}</div>
                <div className="text-xs text-stone-500">{s.items.length} onderdelen</div>
              </div>
              {expired && <span className="text-[10px] uppercase font-semibold text-rose-700 bg-rose-100 px-2 py-1 rounded-full shrink-0">Verlopen</span>}
              <ChevronRightIcon size={16} className="text-stone-300 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SpelerSchemaLogScreen({ schema, onBack, onLog }) {
  const [values, setValues] = useState({});
  const [overallScore, setOverallScore] = useState(null);
  const [note, setNote] = useState("");
  const expired = isSchemaExpired(schema);
  return (
    <div className="p-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-stone-500 mb-3">
        <ArrowLeft size={16} /> Terug
      </button>
      <div className="bg-white rounded-xl p-4 border border-stone-200 mb-4">
        <div className="text-xl font-bold text-slate-900 mb-1">{schema.name}</div>
        <p className="text-sm text-stone-600 mb-3">{schema.description}</p>
        {expired ? (
          <div className="text-sm bg-rose-50 text-rose-700 rounded-lg p-3">
            Dit schema is verlopen sinds {new Date(schema.endDate).toLocaleDateString("nl-NL")} en kan niet meer gelogd worden.
          </div>
        ) : (
          <div className="space-y-4">
            {schema.items.map((it) => (
              <SmileyScale
                key={it.id}
                title={it.label + (it.target ? ` · doel: ${it.target}${it.unit ? " " + it.unit : ""}` : "")}
                scale={TRAINING_FEEL_SCALE}
                value={values[it.id]}
                onChange={(v) => setValues({ ...values, [it.id]: v })}
              />
            ))}
          </div>
        )}
      </div>
      {!expired && (
        <>
          <div className="bg-white rounded-xl p-4 border border-stone-200 mb-3">
            <SmileyScale title="Algemene log score" scale={TRAINING_FEEL_SCALE} value={overallScore} onChange={setOverallScore} />
            <textarea className="w-full border border-stone-300 rounded-lg px-3 py-2 mt-3 text-sm" placeholder="Algemene notitie" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <button onClick={() => onLog(values, note, overallScore)} className="w-full bg-orange-600 text-white font-bold py-2.5 rounded-lg">
            Loggen in logboek
          </button>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Berichten
// ---------------------------------------------------------------------------

function BerichtenScreen({ currentUser, users, players, conversations, conversationHasUnread, onOpen, onStart }) {
  const [showNew, setShowNew] = useState(false);
  const mine = conversations.filter((c) => c.participantIds.includes(currentUser.id));
  const others = users.filter((u) => u.id !== currentUser.id && u.status === "actief" && canMessage(currentUser, u, players));

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-slate-900">Gesprekken</div>
        <button onClick={() => setShowNew(true)} className="text-orange-600 flex items-center gap-1 text-xs font-semibold">
          <Plus size={14} /> Nieuw
        </button>
      </div>
      <div className="space-y-2">
        {mine.map((c) => {
          const otherIds = c.participantIds.filter((id) => id !== currentUser.id);
          const names = otherIds.map((id) => { const u = users.find((x) => x.id === id); return u ? `${u.firstName} ${u.lastName}` : "?"; }).join(", ");
          const last = c.messages[c.messages.length - 1];
          const unread = conversationHasUnread(c);
          return (
            <button key={c.id} onClick={() => onOpen(c.id)} className="w-full bg-white rounded-xl p-3 border border-stone-200 flex items-center justify-between text-left">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-slate-900">{c.isGroup ? "Groep: " : ""}{names}</div>
                <div className="text-xs text-stone-500 truncate">{last ? last.text : "Nog geen berichten"}</div>
              </div>
              {unread && <span className="w-2.5 h-2.5 bg-rose-500 rounded-full shrink-0 ml-2" />}
            </button>
          );
        })}
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50" onClick={() => setShowNew(false)}>
          <div className="bg-white rounded-t-2xl p-4 w-full max-w-md max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="font-bold text-slate-900 mb-1">Nieuw bericht</div>
            <div className="text-xs text-stone-400 mb-3">Je kunt alleen berichten sturen naar mensen aan wie je gekoppeld bent.</div>
            {others.length === 0 && <div className="text-sm text-stone-400 py-2">Nog niemand gekoppeld.</div>}
            {others.map((u) => (
              <button key={u.id} onClick={() => { onStart(u.id); setShowNew(false); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-stone-100 flex items-center justify-between mb-1">
                <span className="text-sm">{u.firstName} {u.lastName}</span>
                <span className="text-xs text-stone-400">{roleDisplay(u)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChatScreen({ convo, currentUser, users, onBack, onSend }) {
  const [text, setText] = useState("");
  const otherIds = convo.participantIds.filter((id) => id !== currentUser.id);
  const names = otherIds.map((id) => { const u = users.find((x) => x.id === id); return u ? `${u.firstName} ${u.lastName}` : "?"; }).join(", ");

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-2">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-stone-500 mb-2">
          <ArrowLeft size={16} /> Terug
        </button>
        <div className="font-bold text-slate-900">{names}</div>
      </div>
      <div className="flex-1 px-4 space-y-2 overflow-y-auto">
        {convo.messages.map((m, i) => {
          const mine = m.from === currentUser.id;
          return (
            <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-orange-600 text-white" : "bg-white border border-stone-200 text-slate-900"}`}>
                {m.text}
                <div className="text-[10px] opacity-60 mt-0.5">{m.time}</div>
              </div>
            </div>
          );
        })}
        {convo.messages.length === 0 && <div className="text-sm text-stone-400 text-center mt-8">Start het gesprek</div>}
      </div>
      <div className="p-3 flex gap-2 border-t border-stone-200 bg-white">
        <input
          className="flex-1 border border-stone-300 rounded-full px-4 py-2 text-sm"
          placeholder="Typ een bericht..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && text) { onSend(text); setText(""); } }}
        />
        <button onClick={() => { if (text) { onSend(text); setText(""); } }} className="bg-orange-600 text-white w-9 h-9 rounded-full flex items-center justify-center">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Meer / Profiel
// ---------------------------------------------------------------------------

function MeerScreen({ user, role, users, onLogout, players, onUpdateTitle }) {
  const [showTeam, setShowTeam] = useState(false);
  const [titleDraft, setTitleDraft] = useState(user.title || "");
  const staff = users.filter((u) => u.role !== "speler" && u.id !== user.id);

  return (
    <div className="p-4 space-y-3">
      <div className="bg-white rounded-xl p-4 border border-stone-200 text-center">
        <div className="w-14 h-14 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-lg mx-auto mb-2">
          {user.firstName[0]}{user.lastName[0]}
        </div>
        <div className="font-bold text-slate-900">{user.firstName} {user.lastName}</div>
        <div className="text-sm text-stone-500">{roleDisplay(user)}</div>
        <div className="text-xs text-stone-400 mt-1">{user.email}</div>
      </div>

      {role === "specialist" && (
        <div className="bg-white rounded-xl p-4 border border-stone-200">
          <div className="text-sm font-semibold text-slate-900 mb-1">Jouw titel</div>
          <div className="text-xs text-stone-400 mb-2">Hiermee word je binnen de app getoond, in plaats van "Specialist" (bijv. Fysiotherapeut, Voedingsdeskundige, Sportpsycholoog).</div>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Specialist"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
            />
            <button onClick={() => onUpdateTitle(titleDraft.trim())} className="bg-orange-600 text-white text-sm font-semibold px-3 rounded-lg">
              Opslaan
            </button>
          </div>
        </div>
      )}

      {role === "specialist" && (
        <button onClick={() => setShowTeam(!showTeam)} className="w-full bg-white rounded-xl p-3 border border-stone-200 flex items-center justify-between text-left">
          <span className="text-sm font-semibold text-slate-900">Team &amp; staf</span>
          <ChevronRightIcon size={16} className="text-stone-300" />
        </button>
      )}
      {showTeam && (
        <div className="bg-white rounded-xl p-3 border border-stone-200 space-y-1">
          {staff.map((u) => (
            <div key={u.id} className="text-sm flex justify-between py-1">
              <span>{u.firstName} {u.lastName}</span>
              <span className="text-stone-400">{roleDisplay(u)}</span>
            </div>
          ))}
        </div>
      )}

      {role === "speler" && (
        <div className="bg-white rounded-xl p-3 border border-stone-200">
          <div className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-1"><Eye size={14} /> Overige spelers</div>
          <div className="space-y-1">
            {players.filter((p) => p.userId !== user.id).map((p) => (
              <div key={p.id} className="text-sm text-stone-700 py-0.5">{p.name}</div>
            ))}
          </div>
          <div className="text-[11px] text-stone-400 mt-2">Je ziet alleen namen van andere spelers.</div>
        </div>
      )}

      <button onClick={onLogout} className="w-full bg-white rounded-xl p-3 border border-stone-200 flex items-center justify-center gap-2 text-rose-600 font-semibold text-sm">
        <LogOut size={16} /> Uitloggen
      </button>
    </div>
  );
}
