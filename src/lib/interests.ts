export const INTEREST_OPTIONS: { key: string; label: string; emoji: string }[] = [
  { key: "running", label: "Running", emoji: "🏃" },
  { key: "hiking", label: "Hiking", emoji: "🥾" },
  { key: "gym", label: "Gym", emoji: "🏋️" },
  { key: "food", label: "Food", emoji: "🍜" },
  { key: "photography", label: "Photography", emoji: "📷" },
  { key: "water", label: "Water", emoji: "🌊" },
  { key: "city", label: "City explore", emoji: "🏙️" },
  { key: "social", label: "Social", emoji: "🎉" },
];

export const TYPE_STYLE: Record<string, { label: string; cls: string }> = {
  everyday: { label: "Everyday", cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" },
  stretch: { label: "Stretch", cls: "bg-orange-500/15 text-orange-300 ring-orange-500/30" },
  wildcard: { label: "Wildcard", cls: "bg-violet-500/15 text-violet-300 ring-violet-500/30" },
};

export const PLATFORM_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  discord: "Discord",
  imessage: "iMessage",
};
