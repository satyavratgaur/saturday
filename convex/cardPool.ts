// The card pool. Source of truth for every deployment (dev and prod):
// dealing auto-loads it into the `cards` table if that table is empty, and
// `npx convex run cards:seed` (add --prod for production) upserts edits.
export type PoolCard = {
  key: string;
  interest: string;
  type: "everyday" | "stretch" | "wildcard";
  name: string;
  blurb: string;
  proof: string;
  points: number;
};

export const CARD_POOL: PoolCard[] = [
  {"key": "run_dawn", "interest": "running", "type": "everyday", "name": "Dawn patrol", "blurb": "A run that starts before sunrise.", "proof": "Photo from the run, sky still dark or just turning.", "points": 3},
  {"key": "run_errand", "interest": "running", "type": "everyday", "name": "Errand run", "blurb": "Run to somewhere you'd normally drive, and back.", "proof": "Photo at the destination with whatever you went for.", "points": 3},
  {"key": "run_newground", "interest": "running", "type": "everyday", "name": "New ground", "blurb": "A route you've never run before.", "proof": "Post the route map after.", "points": 3},
  {"key": "run_double", "interest": "running", "type": "stretch", "name": "Double day", "blurb": "Two separate outdoor sessions in one day, at least one not running.", "proof": "Two photos, at least 4 hours apart.", "points": 4},
  {"key": "run_samehour", "interest": "running", "type": "wildcard", "name": "Same hour", "blurb": "Two or more of you run in the same hour, wherever you are.", "proof": "Both post within 60 minutes and tag each other.", "points": 2},
  {"key": "hike_500", "interest": "hiking", "type": "everyday", "name": "Five hundred up", "blurb": "A walk or hike with at least 500 ft of climbing.", "proof": "Photo from the top plus the elevation screenshot.", "points": 3},
  {"key": "hike_newtrail", "interest": "hiking", "type": "everyday", "name": "New trail", "blurb": "A trail you've never walked.", "proof": "Photo at the trailhead sign.", "points": 3},
  {"key": "hike_lunch", "interest": "hiking", "type": "everyday", "name": "Trail lunch", "blurb": "Eat a real meal somewhere you had to walk to.", "proof": "Photo of the food with the view.", "points": 3},
  {"key": "hike_predawn", "interest": "hiking", "type": "stretch", "name": "Headlamp start", "blurb": "Start a hike before sunrise and watch it come up from the trail.", "proof": "One photo in the dark, one with the sun.", "points": 4},
  {"key": "hike_firsttimer", "interest": "hiking", "type": "wildcard", "name": "First-timer", "blurb": "Take someone who has never done this trail.", "proof": "Photo of both of you on it.", "points": 2},
  {"key": "gym_newclass", "interest": "gym", "type": "everyday", "name": "Not your usual", "blurb": "A class or format you've never done.", "proof": "Photo from inside the class.", "points": 3},
  {"key": "gym_park", "interest": "gym", "type": "everyday", "name": "Park workout", "blurb": "A full session outside with no equipment.", "proof": "Photo mid-set, outdoors.", "points": 3},
  {"key": "gym_early", "interest": "gym", "type": "everyday", "name": "Early bird", "blurb": "In the gym before 7am.", "proof": "Photo with the clock or timestamp.", "points": 3},
  {"key": "gym_twoaday", "interest": "gym", "type": "stretch", "name": "Two-a-day", "blurb": "Two sessions in one day, one of them outside.", "proof": "Two photos, at least 4 hours apart.", "points": 4},
  {"key": "gym_buddy", "interest": "gym", "type": "wildcard", "name": "Bring a buddy", "blurb": "Train with someone who hasn't been to the gym in a month.", "proof": "Photo of both of you there.", "points": 2},
  {"key": "food_outside", "interest": "food", "type": "everyday", "name": "Eat outside", "blurb": "A full meal outdoors, not on a balcony.", "proof": "Photo of the plate with the sky in it.", "points": 3},
  {"key": "food_market", "interest": "food", "type": "everyday", "name": "Market to table", "blurb": "Cook something with an ingredient you bought at a market that day.", "proof": "Photo at the stall and photo of the dish.", "points": 3},
  {"key": "food_newcuisine", "interest": "food", "type": "everyday", "name": "Never had it", "blurb": "Eat a cuisine you've never tried, at a place you had to go to.", "proof": "Photo of the food and the sign.", "points": 3},
  {"key": "food_host", "interest": "food", "type": "stretch", "name": "Feed the table", "blurb": "Cook a full meal for two or more people.", "proof": "Photo of everyone seated.", "points": 4},
  {"key": "food_theirpick", "interest": "food", "type": "wildcard", "name": "Their pick, your kitchen", "blurb": "Someone in the squad names a dish. You make it.", "proof": "Photo of the finished plate.", "points": 2},
  {"key": "photo_golden", "interest": "photography", "type": "everyday", "name": "Golden hour", "blurb": "The sky within 30 minutes of sunrise or sunset, from outside.", "proof": "Photo of the sky, taken in the moment.", "points": 3},
  {"key": "photo_reflection", "interest": "photography", "type": "everyday", "name": "Reflection", "blurb": "A shot using water, glass, or metal as a mirror.", "proof": "The photo.", "points": 3},
  {"key": "photo_threetimes", "interest": "photography", "type": "everyday", "name": "Same spot, three times", "blurb": "One subject at morning, noon, and night.", "proof": "Three photos, same framing.", "points": 3},
  {"key": "photo_stranger", "interest": "photography", "type": "stretch", "name": "Stranger's portrait", "blurb": "Ask a stranger if you can take their portrait.", "proof": "The portrait, with their okay.", "points": 4},
  {"key": "photo_walk", "interest": "photography", "type": "wildcard", "name": "Photo walk", "blurb": "Walk with a squad member and shoot the same street.", "proof": "Both post your version.", "points": 2},
  {"key": "water_touch", "interest": "water", "type": "everyday", "name": "Touch water", "blurb": "Get to a body of water and get in, even just your feet.", "proof": "Photo with your feet in.", "points": 3},
  {"key": "water_sunrise", "interest": "water", "type": "everyday", "name": "Sunrise by the water", "blurb": "Be at the shore, lake, or river when the sun comes up.", "proof": "Photo with the sun and the water.", "points": 3},
  {"key": "water_onit", "interest": "water", "type": "everyday", "name": "On it", "blurb": "Anything that floats: kayak, paddleboard, canoe, surf.", "proof": "Photo from the water.", "points": 3},
  {"key": "water_in", "interest": "water", "type": "stretch", "name": "All the way in", "blurb": "Full submersion in a natural body of water.", "proof": "Photo of you wet, at the water.", "points": 4},
  {"key": "water_buddy", "interest": "water", "type": "wildcard", "name": "Water hour", "blurb": "Two of you at water in the same hour, anywhere.", "proof": "Both post within 60 minutes.", "points": 2},
  {"key": "city_nocar", "interest": "city", "type": "everyday", "name": "New place, no car", "blurb": "Somewhere you've never been, reached on foot, bike, or transit.", "proof": "Photo there plus how you got there.", "points": 3},
  {"key": "city_oldroad", "interest": "city", "type": "everyday", "name": "Old road", "blurb": "A place you haven't been to in over a year.", "proof": "Photo there plus when you were last here.", "points": 3},
  {"key": "city_highpoint", "interest": "city", "type": "everyday", "name": "High point", "blurb": "The highest public spot you can reach in your city.", "proof": "Photo of the view.", "points": 3},
  {"key": "city_endofline", "interest": "city", "type": "stretch", "name": "End of the line", "blurb": "Take a bus or train you've never taken to its last stop and explore.", "proof": "Photo at the last stop.", "points": 4},
  {"key": "city_guide", "interest": "city", "type": "wildcard", "name": "Tour guide", "blurb": "Show a squad member a place they've never been.", "proof": "Photo of both of you there.", "points": 2},
  {"key": "social_recruit", "interest": "social", "type": "wildcard", "name": "Recruit", "blurb": "Bring someone outside the squad on any outdoor thing this week.", "proof": "Photo of both of you.", "points": 2},
  {"key": "social_walkcall", "interest": "social", "type": "everyday", "name": "Walk and call", "blurb": "A 30-minute walk while on the phone with someone you haven't talked to in a month.", "proof": "Photo from the walk, say who.", "points": 3},
  {"key": "social_eatwith", "interest": "social", "type": "everyday", "name": "Table for two", "blurb": "A meal outside with someone, no phones on the table.", "proof": "Photo of the table.", "points": 3},
  {"key": "social_plog", "interest": "social", "type": "everyday", "name": "Plog", "blurb": "A walk where you pick up ten pieces of trash.", "proof": "Photo of the haul.", "points": 3},
  {"key": "social_host", "interest": "social", "type": "stretch", "name": "Host something active", "blurb": "Get three or more people to yours or a park for something that isn't sitting.", "proof": "Photo of the group mid-activity.", "points": 4},
];
