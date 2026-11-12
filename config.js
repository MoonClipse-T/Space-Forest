// PROTOTYPE - NOT FOR PRODUCTION
// Question: 계획서, 재료 구하기, 제작, 발사 사이에 서로 장난치는 것이 한 차시 동안 재미있는가?
// Date: 2026-11-11
// Every tuning value lives here, each with value, min, max and step. The game reads them live
// through tune.<name> (index.html); the tweak panel, an add-on, writes them back here.
window.CONFIG = {
  seed: 1, // every gameplay random call reads rng(), seeded from this (or ?seed= in the address)
  volume: { value: 0.5, min: 0, max: 1, step: 0.05 },

  // Moving and seeing
  walk_speed: { value: 6.5, min: 3, max: 12, step: 0.5 },        // player, units per second
  bot_speed: { value: 4.6, min: 2, max: 10, step: 0.2 },         // bot friends, units per second
  cam_height: { value: 10.5, min: 6, max: 18, step: 0.5 },       // camera above the player
  cam_back: { value: 12.5, min: 6, max: 20, step: 0.5 },         // camera behind (south of) the player
  curve: { value: 0.011, min: 0, max: 0.03, step: 0.001 },       // how fast the ground rolls away to the north
  interact_range: { value: 2.6, min: 1.5, max: 5, step: 0.1 },   // how near a thing must be to act on it

  zoom_min: { value: 0.7, min: 0.4, max: 1, step: 0.05 },         // closest view, times the normal distance
  zoom_max: { value: 8, min: 1.5, max: 12, step: 0.5 },           // farthest view: the whole journey as a map
  zoom_step: { value: 1.4, min: 1.1, max: 2, step: 0.05 },        // how much one press of the zoom buttons changes the view

  // Getting and building
  bag_size: { value: 2, min: 1, max: 10, step: 1 },              // items the bag holds: full, and you must go and build
  build_time: { value: 1.6, min: 0.4, max: 5, step: 0.1 },       // seconds to fit one part
  quiz_retry: { value: 4, min: 0, max: 15, step: 1 },            // seconds a shopkeeper sulks after a wrong answer
  plan_min_chars: { value: 8, min: 1, max: 60, step: 1 },        // letters each plan answer needs

  // Mini-games before the space age
  stair_goal: { value: 100, min: 10, max: 300, step: 10 },       // 첨성대 꼭대기까지 계단 수
  stair_drain: { value: 0.14, min: 0.05, max: 0.6, step: 0.01 }, // 처음에 시간 막대가 1초에 줄어드는 양 (꽉 참 = 1) · 11-12 0.15 → 0.14
  stair_drain_up: { value: 0.18, min: 0, max: 0.6, step: 0.01 }, // 꼭대기에 다가갈수록 더 빨리 줄어드는 양 · 11-12 0.2 → 0.18
  stair_refill: { value: 0.07, min: 0.02, max: 0.3, step: 0.01 }, // 한 칸 오를 때 채워지는 양
  stair_turn: { value: 0.38, min: 0.1, max: 0.7, step: 0.02 },   // 계단이 꺾일 확률
  train_need: { value: 3, min: 1, max: 6, step: 1 },              // 기차 셈 문제를 몇 번 맞혀야 하나

  // Pranks
  prank_cooldown: { value: 45, min: 5, max: 180, step: 5 },      // seconds before the same kid can prank again
  pad_shield: { value: 35, min: 0, max: 180, step: 5 },          // seconds a pranked workshop is safe afterwards
  first_prank_min: { value: 180, min: 0, max: 600, step: 10 },   // seconds before bots may prank the player (the brief: 3 to 5 minutes)
  bot_prank_chance: { value: 0.3, min: 0, max: 1, step: 0.05 },  // chance a bot pranks instead of working, when it can
  stash_min_dist: { value: 10, min: 3, max: 30, step: 1 },       // how far a taken thing must be carried before hiding it
  chest_count: { value: 4, min: 0, max: 6, step: 1 },             // treasure chests to hide things in, in each era
  repair_hits: { value: 3, min: 1, max: 8, step: 1 },            // good presses to tighten the screws
  repair_speed: { value: 0.75, min: 0.2, max: 2, step: 0.05 },   // needle turns per second
  repair_window: { value: 0.2, min: 0.05, max: 0.5, step: 0.01 },// part of the dial that counts as a hit
  clean_time: { value: 3, min: 0.5, max: 10, step: 0.5 },        // seconds of scrubbing to clean doodles
  bot_fix_time: { value: 6, min: 1, max: 30, step: 1 },          // seconds a bot needs to fix its workshop

  // Bot friends (the stand-in for classmates)
  bot_count: { value: 29, min: 0, max: 29, step: 1 },            // 29 bots and you: a class of 30
  bot_plan_time: { value: 150, min: 5, max: 600, step: 5 },      // seconds a bot spends writing its plan
  bot_approve_time: { value: 20, min: 0, max: 300, step: 5 },    // seconds until a bot's plan is stamped
  bot_shop_time: { value: 36, min: 1, max: 120, step: 1 },       // seconds a bot spends getting one item
  staged_prank_at: { value: 14, min: 2, max: 120, step: 1 },     // seconds in, one bot runs off with another's part (the first minute)
};
