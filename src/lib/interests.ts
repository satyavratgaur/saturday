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

export const INTEREST_BY_KEY: Record<string, { key: string; label: string; emoji: string }> = Object.fromEntries(
  INTEREST_OPTIONS.map((o) => [o.key, o]),
);

export const TYPE_STYLE: Record<string, { label: string; cls: string }> = {
  everyday: { label: "Everyday", cls: "card-everyday" },
  stretch: { label: "Stretch", cls: "card-stretch" },
  wildcard: { label: "Wildcard", cls: "card-wildcard" },
};

export const PLATFORM_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  discord: "Discord",
  imessage: "iMessage",
};

/** Three real cards from the pool, used on the landing page. */
export const SAMPLE_CARDS = [
  { key: "run_dawn", interest: "running", type: "everyday" as const, name: "Dawn patrol", blurb: "A run that starts before sunrise.", proof: "Photo from the run, sky still dark or just turning.", points: 3 },
  { key: "hike_predawn", interest: "hiking", type: "stretch" as const, name: "Headlamp start", blurb: "Start a hike before sunrise and watch it come up from the trail.", proof: "One photo in the dark, one with the sun.", points: 4 },
  { key: "run_samehour", interest: "running", type: "wildcard" as const, name: "Same hour", blurb: "Two or more of you run in the same hour, wherever you are.", proof: "Both post within 60 minutes and tag each other.", points: 2 },
];
