// PROTOTYPE - NOT FOR PRODUCTION
// 우주의 숲: the words of the game. Missions, shops, items and plan questions,
// all from the textbook's pages 300 to 304 (Ⅷ. 별과 우주, 03 우주 탐사).
'use strict';

// Six missions: the textbook's "미래에 등장할 새로운 우주 탐사의 계획".
const MISSIONS = [
  { id: 'moon', name: '달 기지 건설', hint: '달에 사람이 머물 기지를 짓는 임무',
    bot: ['달에 기지를 지으면 더 먼 우주로 가는 정거장이 생긴다.', '달 남극의 얼음을 찾아 돔 기지를 세운다.', '공기가 없으니 우주복과 헬멧을 꼭 점검한다.', '동결 건조 식품: 가볍고 오래가니까.'] },
  { id: 'mars', name: '화성 생명체 탐사', hint: '화성의 암석과 토양에서 생명의 흔적을 찾는 임무',
    bot: ['외계 생명체가 있는지 알면 우주에 대한 호기심이 풀린다.', '탐사 로봇으로 화성 흙을 채취해 분석한다.', '모래 폭풍에 대비해 튼튼한 몸체를 쓴다.', '건강 검진기: 긴 여행 중 몸 상태를 본다.'] },
  { id: 'mine', name: '우주 자원 개발', hint: '소행성에서 자원을 캐 오는 임무',
    bot: ['지구 자원의 한계를 우주 자원으로 넘을 수 있다.', '소행성에 착륙해 금속을 캐서 가져온다.', 'GPS와 안테나로 위치를 놓치지 않는다.', '전자레인지: 캐는 동안 따뜻한 밥을 먹는다.'] },
  { id: 'home', name: '새 거주 행성 찾기', hint: '인류가 살 수 있는 새로운 행성을 찾는 임무',
    bot: ['미래의 인류가 살아갈 새 터전을 마련할 수 있다.', '물과 공기가 있는 행성을 망원경과 탐사선으로 찾는다.', '오랜 비행에 대비해 식량을 넉넉히 싣는다.', '동결 건조 식품과 건강 검진기.'] },
  { id: 'deep', name: '태양계 밖 탐사', hint: '보이저호처럼 태양계 너머로 나아가는 임무',
    bot: ['우주의 기원과 구조를 더 잘 이해할 수 있다.', '탐사선을 태양계 밖으로 보내 사진을 전송받는다.', '아주 멀어도 신호가 닿도록 큰 안테나를 단다.', 'GPS 수신기와 안테나.'] },
  { id: 'orbit', name: '궤도 거주지 건설', hint: '지구 궤도에 사람이 사는 인공 거주지를 만드는 임무',
    bot: ['국제 우주 정거장처럼 여러 나라가 협력하게 된다.', '궤도에 모듈을 하나씩 올려 이어 붙인다.', '우주 쓰레기와 부딪히지 않게 궤도를 살핀다.', '전자레인지와 기능성 옷.'] },
];

// The plan form: what the textbook's 탐구 (p.304) says a plan must consider.
const PLAN_FIELDS = [
  { key: 'ship', label: '내 우주선 이름', ph: '예: 반짝이 1호', short: true },
  { key: 'why', label: '탐사 목적과 의의', ph: '이 탐사가 왜 필요하고, 인류에게 어떤 도움이 될까?' },
  { key: 'what', label: '우주에 가서 할 일', ph: '도착해서 무엇을 어떻게 할지 구체적으로!' },
  { key: 'safe', label: '안전·생존 대책', ph: '극한 환경에서 어떻게 살아남을까?' },
  { key: 'pack', label: '가져갈 것과 그 까닭', ph: '무엇을 왜 챙길까?' },
];

// Six shops, one per technology in the textbook's 그림 13.
const SHOPS = [
  // 석기 섬 (centre z 900)
  { id: 'flint', era: 0, name: '부싯돌 바위', keeper: '딱딱 씨', x: -24, z: 886, roof: 0xd9b38c },
  { id: 'knap', era: 0, name: '돌 깨는 터', keeper: '쾅쾅 씨', x: 24, z: 886, roof: 0xc9a27e },
  { id: 'ochre', era: 0, name: '황토 물감 굴', keeper: '알록 씨', x: -24, z: 908, roof: 0xf0a070 },
  // 철기 섬 (centre z 600)
  { id: 'smith', era: 1, name: '대장간', keeper: '쇠돌 씨', x: -24, z: 586, roof: 0xe8c66a },
  { id: 'farm', era: 1, name: '논두렁 달력집', keeper: '벼리 씨', x: 24, z: 586, roof: 0xe8c66a },
  { id: 'mason', era: 1, name: '돌 다듬는 집', keeper: '다듬 씨', x: -24, z: 608, roof: 0xe8c66a },
  // 산업 섬 (centre z 300)
  { id: 'lens', era: 2, name: '렌즈 공방', keeper: '반짝 박사', x: -24, z: 286, roof: 0x8f6f8f },
  { id: 'steam', era: 2, name: '기차 공장', keeper: '칙칙 씨', x: 24, z: 286, roof: 0x8f6f8f },
  { id: 'rocketlab', era: 2, name: '비행기 공방', keeper: '붕붕 박사', x: -24, z: 308, roof: 0x8f6f8f },
  // 우주
  { id: 'cloth', name: '기능성 옷감 가게', keeper: '보들 씨', x: -23, z: -8, roof: 0xf4a6b8 },
  { id: 'poly', name: '폴리카보네이트 공방', keeper: '단단 씨', x: -23, z: 6, roof: 0x9ad0ec },
  { id: 'alloy', name: '형상 기억 합금 대장간', keeper: '구불 씨', x: -23, z: 20, roof: 0xc3b1e1 },
  { id: 'diner', name: '우주 식당', keeper: '냠냠 씨', x: 23, z: -8, roof: 0xffc98b },
  { id: 'sat', name: '위성 관제소', keeper: '삐삐 씨', x: 23, z: 6, roof: 0x9fe0c6 },
  { id: 'mri', name: '진단실', keeper: '찰칵 씨', x: 23, z: 20, roof: 0xf7e08a },
].map(sh => Object.assign({ era: 3 }, sh));

// Ten parts. Each needs one item from a shop; the keeper asks one thing before handing it over.
// group: suit (worn), ship (on the rocket), cargo (beside the rocket).
const PARTS = [
  // 우주 시대 이전: 재미로. kind 'word' = 답을 써서 맞히는 넌센스, 'num' = 숫자를 써서 맞히는 상식(틀리면 업·다운 힌트),
  // 'nono' = 네모네모 로직으로 뗀석기 칠하기, 'moon' = 달 모양 이름 쓰기, 'stairs' = 첨성대 계단 오르기,
  // 'scope' = 망원경 속 틀린 그림 찾기, 'train' = 기차에 남은 사람 세기. (교과서 문제는 우주 시대에서)
  // 단답은 오차 없이 딱 맞아야 정답 (숫자는 17000 · 17,000 · 1만 7천처럼 쓰는 법만 너그럽게)
  { id: 'st_fire', era: 0, group: 'era', name: '모닥불', item: '부싯돌', shop: 'flint', kind: 'word',
    q: '[넌센스] 세상에서 가장 뜨거운 바다는? (세 글자)', ans: ['열바다', '열받아'], hint: '화가 나면 머리에서 김이 나지… "열○○"',
    fact: '열~바다! 열받아! 크크. 자, 불꽃 튀는 부싯돌 받아 가.' },
  { id: 'st_axe', era: 0, group: 'era', name: '돌도끼', item: '뗀석기 돌날', shop: 'knap', kind: 'nono',
    q: '네모네모 로직! 줄마다 적힌 숫자만큼 칸을 이어 칠하면 돌 속에 숨은 뗀석기가 나와.',
    fact: '짠, 주먹도끼! 돌을 깨서 날을 세운 이런 도구가 뗀석기야.' },
  { id: 'st_wall', era: 0, group: 'era', name: '하늘 벽화', item: '황토 물감', shop: 'ochre', kind: 'num',
    q: '프랑스 라스코 동굴 벽화는 약 몇 년 전에 그려졌을까?', ans: 17000, unit: '년 전',
    fact: '1만 7천 년 전! 들소와 말이 아직도 생생하게 남아 있대.' },
  // 철기 시대
  { id: 'ir_tool', era: 1, group: 'era', name: '쇠 낫', item: '쇳덩이', shop: 'smith', kind: 'word',
    q: '[넌센스] 대장간 화로처럼 세상에서 가장 뜨거운 과일은?', ans: ['천도복숭아'], hint: '온도는 "도"로 재지. 아주아주 뜨거운 ○○복숭아!',
    fact: '천 도(度) 복숭아! 쇠를 녹이려면 천 도보다 훨씬 뜨거워야 해.' },
  { id: 'ir_cal', era: 1, group: 'era', name: '돌 달력', item: '볍씨 자루', shop: 'farm', kind: 'moon',
    q: '1학년 때 배운 달, 기억나? 오늘 밤 달의 모양 이름을 써 봐!',
    fact: '삭 → 초승 → 상현 → 망 → 하현 → 그믐. 옛사람들은 달 모양으로 날짜를 셌어.' },
  { id: 'ir_tower', era: 1, group: 'era', name: '작은 첨성대', item: '다듬은 돌', shop: 'mason', kind: 'stairs',
    q: '첨성대 꼭대기까지 돌계단 100칸! 계단이 꺾이는 방향을 잘 보고 올라가 봐.',
    fact: '꼭대기 도착! 신라 사람들은 첨성대에서 별을 살폈다고 해.' },
  // 산업 시대: 망원경, 기차, 비행기
  { id: 'in_scope', era: 2, group: 'era', name: '망원경', item: '볼록 렌즈', shop: 'lens', kind: 'scope',
    q: '망원경으로 두 밤하늘을 비교해 봐. 다른 곳 네 군데를 찾으면 렌즈를 줄게!',
    fact: '눈썰미 최고! 갈릴레이도 이렇게 꼼꼼히 보다가 목성의 위성 넷을 찾았어.' },
  { id: 'in_steam', era: 2, group: 'era', name: '증기 기관차', item: '톱니바퀴', shop: 'steam', kind: 'train',
    q: '칙칙폭폭! 역마다 타고 내리는 사람을 잘 세어 봐. 마지막에 기차에 남은 사람은 몇 명? 세 번 맞히면 톱니바퀴를 줄게.',
    fact: '셈 박사네! 기차가 생기고 사람과 물건이 훨씬 멀리, 많이 오갔어.' },
  { id: 'in_plane', era: 2, group: 'era', name: '비행기', item: '프로펠러', shop: 'rocketlab', kind: 'num',
    q: '1903년 라이트 형제의 첫 비행은 몇 초 동안 날았을까?', ans: 12, unit: '초',
    fact: '겨우 12초! 그래도 사람이 기계를 타고 처음 하늘을 난 순간이야. 다음은… 우주!' },
  // 우주 시대
  { id: 'suit', group: 'suit', name: '우주복 몸체', item: '기능성 옷감', shop: 'cloth',
    q: '이 옷감, 원래 뭘 만들려고 개발한 신소재게?', a: ['우주복', '수영복', '한복'],
    fact: '맞아! 우주복 용도로 개발된 신소재가 기능성 옷에 쓰이지.' },
  { id: 'outer', group: 'suit', name: '우주복 외피', item: '테프론', shop: 'cloth',
    q: '테프론, 집에서는 어디에 코팅돼 있게?', a: ['프라이팬', '유리창', '칠판'],
    fact: '그렇지! 우주복 외피가 되어 극한의 우주에서 몸을 지켜 줘.' },
  { id: 'helmet', group: 'suit', name: '헬멧', item: '폴리카보네이트 반구', shop: 'poly',
    q: '폴리카보네이트의 자랑은 뭘까?', a: ['열에 강하고 단단하다', '물에 잘 녹는다', '고무처럼 늘어난다'],
    fact: '정답! 그래서 안전모에도 쓰여.' },
  { id: 'hull', group: 'ship', name: '우주선 몸체', item: '폴리카보네이트 판', shop: 'poly',
    q: '폴리카보네이트, 일상에서는 어디에 쓰일까?', a: ['안전모', '솜사탕', '연필심'],
    fact: '좋아! 단단한 판으로 몸체를 만들어 봐.' },
  { id: 'engine', group: 'ship', name: '로켓 엔진', item: '엔진 부품', shop: 'alloy',
    q: '2021년에 쏜 한국형 우주 발사체 이름은?', a: ['누리호', '다누리호', '우리별 1호'],
    fact: '누리호! 로켓이 발달해서 위성도 탐사선도 쏠 수 있게 됐지.' },
  { id: 'antenna', group: 'ship', name: '안테나', item: '형상 기억 합금', shop: 'alloy',
    q: '형상 기억 합금은 원래 우주선의 무엇으로 개발됐게?', a: ['안테나', '창문', '의자'],
    fact: '그래! 지금은 안경테랑 치아 교정 장치에도 쓰여.' },
  { id: 'nav', group: 'ship', name: '항법 장치', item: 'GPS 수신기', shop: 'sat',
    q: '인공위성으로 내 위치를 알려 주는 시스템은?', a: ['GPS', 'MRI', 'CT'],
    fact: '삐빅! 위성 항법 시스템, GPS. 길을 잃지 않겠네.' },
  { id: 'oven', group: 'cargo', name: '전자레인지', item: '전자레인지', shop: 'diner',
    q: '전자레인지는 원래 어디서 요리하려고 만들었게?', a: ['우주 비행선', '잠수함', '남극 기지'],
    fact: '딩동! 우주 비행선에서 쓰려던 게 부엌까지 왔어.' },
  { id: 'food', group: 'cargo', name: '우주 식량', item: '동결 건조 식품', shop: 'diner',
    q: '동결 건조 식품은 뭘 빼서 가볍게 만들었게?', a: ['수분', '영양분', '맛'],
    fact: '맞아! 수분만 빼고 영양은 그대로야.' },
  { id: 'scan', group: 'cargo', name: '건강 검진기', item: '영상 검진 장치', shop: 'mri',
    q: 'MRI는 우주선의 어떤 기술에서 착안했게?', a: ['영상 처리 기술', '엔진 기술', '낙하산 기술'],
    fact: '찰칵! 우주선 영상 처리 기술이 질병 진단에 쓰이지.' },
].map(p => Object.assign({ era: 3 }, p));
const WRONG_LINES = ['땡! 교과서를 슬쩍 보고 와도 돼.', '아쉽다! 조금 있다 다시 물어봐 줄게.', '음… 그건 아니야. 다시 생각해 봐!'];

const BOT_NAMES = ['콩이봇', '별이봇', '두부봇', '망고봇', '솜이봇', '토리봇', '모카봇', '라온봇', '새벽봇', '하늘봇', '보리봇', '감자봇', '우주봇', '달님봇',
  '구름봇', '바다봇', '꿀떡봇', '호두봇', '은하봇', '단비봇', '초코봇', '자두봇', '나비봇', '햇살봇', '사과봇', '푸딩봇', '노을봇', '도토리봇', '해님봇'];
const SHIRTS = [0xff8fa3, 0x7cc6fe, 0xffd166, 0x95e1a3, 0xc9a0ff, 0xffa26b, 0x6ee7d8, 0xf78fd0, 0xa3b8ff, 0xd4e157, 0xff7b7b, 0x80cbc4, 0xe6b98a, 0xb39ddb, 0x90caf9];
const SHIRT_NAMES = ['분홍', '하늘', '노랑', '연두', '보라', '주황', '민트', '자주', '파랑', '라임', '빨강', '청록', '살구', '연보라', '물빛'];

// Where things stand. x is east, z is south; the camera always looks north.
// Every era is its own island, far apart; a portal on each island's north hill takes you to the next one.
const ERA_Z = [900, 600, 300];  // centre of the first three islands; the space village sits round z 10
const zoneOf = z => (z > 750 ? 0 : z > 450 ? 1 : z > 150 ? 2 : 3);
const PORTAL = ERA_Z.map((zc, e) => ({ x: 0, z: zc - 37, portal: true, era: e })); // up on the hill, opens on the teacher's OK
const ARRIVE = [null, { x: 0, z: ERA_Z[1] + 25 }, { x: 0, z: ERA_Z[2] + 25 }, { x: 0, z: 61 }]; // where you land on the next island
const PLACES = {
  spawn: { x: 0, z: 925 },      // everyone wakes up on the 석기 시대 island
  gacha: { x: -4.5, z: -2 },
  desk: { x: 7, z: -9.5 },
  hq: { x: 7, z: -15 },
  launch: { x: 0, z: -30 },
};
// 30 work spots in every era; kid i always has spot i, and it moves north with them.
const PAD_SPOTS = [[], [], [], []];
ERA_Z.forEach((zc, e) => [0, 1, 2, 3, 4, 5].forEach(r => [0, -6, 6, -12, 12].forEach(x => PAD_SPOTS[e].push({ x, z: zc - 10 + r * 5.6 }))));
[13, 21, 29, 37, 45, 53].forEach(z => [0, -6.5, 6.5, -13, 13].forEach(x => PAD_SPOTS[3].push({ x, z })));
// 31번째 자리(번호 30): 깍두기 선생님의 작업장. 학생 30명 자리와 겹치지 않게 오른쪽 끝에
const KK_SLOT = 30;
ERA_Z.forEach((zc, e) => PAD_SPOTS[e].push({ x: 18, z: zc + 4 }));
PAD_SPOTS[3].push({ x: 19.5, z: 33 });
// Places to hide a taken thing, per era; the first chest_count of each era are treasure chests.
const HIDE_SPOTS = [
  { era: 3, x: -14, z: -30 }, { era: 3, x: 15, z: -32 }, { era: 3, x: -31, z: -1 }, { era: 3, x: 31, z: 13 }, { era: 3, x: -31, z: 13 },
  { era: 3, x: 31, z: -1 }, { era: 3, x: -30, z: 40 }, { era: 3, x: 30, z: 40 }, { era: 3, x: -12, z: -4 }, { era: 3, x: 13, z: 1 },
];
[[[-43, 12], [35, -12], [-16, -30], [30, 24], [-14, 27], [20, -30]], // 석기: one chest across the river, one on the hill
 [[43, -2], [-35, -12], [16, -30], [-30, 24], [14, 27], [-20, -30]],   // 철기
 [[-34, -10], [28, -8], [-16, -30], [-30, 22], [6, 35], [20, -30]]]  // 산업: one down on the beach
  .forEach((list, era) => list.forEach(([x, dz]) => HIDE_SPOTS.push({ era, x, z: ERA_Z[era] + dz })));

// The four eras. Each has its own words for the three pranks. The first three are for fun and end in a drawing the
// teacher OKs; the space age is the textbook part, with its quizzes and the written exploration plan.
const ERAS = [
  { id: 'stone', name: '석기 시대', when: '약 1만 년 전', motto: '하늘을 처음 올려다본 사람들', ground: 0xf0e0b4,
    chief: '족장 우가', work: '모닥불 자리',
    intro: ['우가! 여긴 석기 시대야. 아직 글자도 없지만, 밤하늘은 누구나 올려다보지.', '부싯돌로 불을 피우고, 돌도끼를 만들고, 동굴 벽에 하늘을 그려 와.', '다 만들면 나한테 와서 그림 시험을 봐. 선생님이 OK 하시면 언덕 위 시간의 포탈이 열려!'],
    test: { title: '동굴 벽화 시험', paper: 'cave', ask: '부족에게 밤하늘을 남겨 줘! 네가 본 달과 별을 동굴 벽에 그려 봐.' },
    loose: { act: '모닥불에 흙 뿌리기', done: '모닥불이 꺼졌다!', fix: '불씨 살리기', game: '부싯돌 딱! 초록 칸에서 치기', fixed: '불이 다시 활활 탄다!', need: 'st_fire', already: '이미 불이 꺼져 있어', check: '꺼진 모닥불' },
    doodle: { act: '벽화에 진흙 칠하기', done: '벽화에 진흙이 묻었다!', fix: '진흙 닦기', fixed: '벽화가 깨끗해졌다!', on: 'st_wall', already: '이미 진흙투성이야', none: '칠할 벽화가 없어', check: '진흙 묻은 벽화', color: 0x8a5a36 } },
  { id: 'iron', name: '철기 시대', when: '약 2,500년 전', motto: '하늘을 읽어 농사를 짓다', ground: 0xcdeaa8,
    chief: '선생님', work: '관측 마당',
    intro: ['어서 와, 철기 마을이야! 이 마을에선 내가 선생님이지. 에헴.', '쇠 낫을 벼리고, 돌 달력을 만들고, 작은 첨성대를 쌓아 와.', '다 되면 그림 시험이 있어. 문제는… 비밀! 선생님 OK가 나면 산업 시대로 가는 포탈이 열려.'],
    // 문제는 시험지를 펼칠 때 처음 공개 (그전에는 pub 만 보인다)
    test: { title: '선생님 얼굴 그리기', pub: '비밀 그림 시험', paper: 'hanji', reveal: ['두구두구두구…', '철기 마을 그림 시험 문제는 바로…!'], ask: '선생님 얼굴 그리기! 닮게 그릴수록 OK 받기 쉽겠지?', ph: '예: 우리 선생님 웃는 얼굴' },
    loose: { act: '풀무 바람 빼기', done: '화로 불이 식어 버렸다!', fix: '풀무 밟기', game: '풀무 쿵! 초록 칸에서 밟기', fixed: '화로가 다시 벌겋게 달았다!', need: 'ir_tool', already: '이미 화로가 식어 있어', check: '식은 화로' },
    doodle: { act: '녹물 칠하기', done: '돌 달력에 녹물이 번졌다!', fix: '녹물 닦기', fixed: '달력이 깨끗해졌다!', on: 'ir_cal', already: '이미 녹물투성이야', none: '칠할 달력이 없어', check: '녹물 번진 달력', color: 0xc0602a } },
  { id: 'steam', name: '산업 시대', when: '약 100~300년 전', motto: '망원경과 기차, 하늘을 나는 꿈', ground: 0xd9d2e6,
    chief: '발명 박사 뚝딱', work: '발명 작업대',
    intro: ['산업 시대에 온 걸 환영해! 칙칙폭폭, 기계가 세상을 바꾸고 있지.', '망원경으로 하늘을 당겨 보고, 증기 기관차를 만들고, 비행기를 띄워 봐.', '셋 다 되면 나한테 그림 시험을 봐. 선생님 OK면 드디어 우주 시대야!'],
    test: { title: '탈것 발명 시험', paper: 'blueprint', ask: '산업 시대의 탈것을 설계도에 그려 봐! 칙칙폭폭 기차나 하늘을 나는 비행기.' },
    loose: { act: '톱니 빼 놓기', done: '증기 기관차가 멈췄다!', fix: '톱니 끼우기', game: '톱니 착! 초록 칸에서 끼우기', fixed: '기관차가 다시 칙칙폭폭!', need: 'in_steam', already: '이미 기관차가 멈춰 있어', check: '멈춘 기관차' },
    doodle: { act: '기름 얼룩 묻히기', done: '망원경 렌즈에 기름 얼룩이!', fix: '렌즈 닦기', fixed: '렌즈가 반짝반짝!', on: 'in_scope', already: '이미 얼룩투성이야', none: '얼룩질 망원경이 없어', check: '기름 묻은 렌즈', color: 0x4a4060 } },
  { id: 'space', name: '우주 시대', when: '1957년 ~ 지금', motto: '드디어 우주로!', ground: 0x9fe6c3,
    chief: '도장 로봇', work: '내 작업장',
    loose: { act: '나사 풀기', done: '우주선 나사가 풀렸다!', fix: '나사 조이기', game: '바늘이 초록 칸에 올 때 누르기!', fixed: '나사를 꽉 조였다!', need: '', already: '이미 나사가 풀려 있어', check: '풀린 나사' },
    doodle: { act: '낙서하기', done: '우주선에 낙서가 생겼다!', fix: '낙서 지우기', fixed: '반짝반짝! 낙서를 다 지웠다', on: 'hull', already: '이미 낙서투성이야', none: '낙서할 몸체가 없어', check: '낙서' } },
];
// Each early era's chief stands by its portal and gives the test.
const CHIEF_SPOT = e => ({ x: -5, z: PORTAL[e].z + 4 });

// 달의 위상 (북반구에서 본 모양). lit: 밝은 쪽 (+1 오른쪽, -1 왼쪽), k: 밝은 부분 (0 = 안 보임 ~ 1 = 꽉 참)
const MOON_PHASES = [
  { name: '삭', ans: ['삭', '삭월', '신월'], lit: 1, k: 0, say: '해와 같은 쪽에 있어서 밝은 면이 보이지 않아.' },
  { name: '초승달', ans: ['초승', '초승달'], lit: 1, k: 0.2, say: '저녁 서쪽 하늘에 오른쪽이 가늘게 빛나.' },
  { name: '상현달', ans: ['상현', '상현달'], lit: 1, k: 0.5, say: '오른쪽 반이 밝은 반달이야.' },
  { name: '망(보름달)', ans: ['망', '보름', '보름달', '망월'], lit: 1, k: 1, say: '둥근 달 전체가 밝아.' },
  { name: '하현달', ans: ['하현', '하현달'], lit: -1, k: 0.5, say: '왼쪽 반이 밝은 반달이야.' },
  { name: '그믐달', ans: ['그믐', '그믐달'], lit: -1, k: 0.2, say: '새벽 동쪽 하늘에 왼쪽이 가늘게 빛나.' },
];
// 뗀석기 네모네모 로직 (9 × 10, 줄마다 한 덩어리라 차근차근 풀면 답이 하나로 정해진다)
const NONO_AXE = [
  '....#....',
  '...###...',
  '...###...',
  '..#####..',
  '..#####..',
  '.#######.',
  '.#######.',
  '.#######.',
  '..#####..',
  '...###...',
];
const TEACHER_PIN = '교사'; // 선생님 화면 · 학생 기기에서 선생님이 OK를 누를 때 쓰는 암호 (바꿔 쓰세요)
// 한글 암호: 띄어쓰기 · 대소문자는 무시하고, 자모가 나뉘어 들어와도(NFD) 같은 글자로 본다.
// 자판이 영어로 되어 있어도 같은 자리를 누르면 통과 (두벌식: 교사 = r y t k)
const TEACHER_PIN_EN = 'rytk';
const pinOK = v => { const s = String(v || '').normalize('NFC').replace(/\s/g, ''); return s === TEACHER_PIN || s.toLowerCase() === TEACHER_PIN_EN; };
// 암호 칸: type=password 는 안드로이드(디벗)에서 한글 자판이 막히므로 글자 칸에 점으로만 가린다
const PIN_CSS = '-webkit-text-security:disc;text-security:disc';
