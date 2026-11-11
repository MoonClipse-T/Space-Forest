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
  { id: 'cloth', name: '기능성 옷감 가게', keeper: '보들 씨', x: -23, z: -8, roof: 0xf4a6b8 },
  { id: 'poly', name: '폴리카보네이트 공방', keeper: '단단 씨', x: -23, z: 6, roof: 0x9ad0ec },
  { id: 'alloy', name: '형상 기억 합금 대장간', keeper: '구불 씨', x: -23, z: 20, roof: 0xc3b1e1 },
  { id: 'diner', name: '우주 식당', keeper: '냠냠 씨', x: 23, z: -8, roof: 0xffc98b },
  { id: 'sat', name: '위성 관제소', keeper: '삐삐 씨', x: 23, z: 6, roof: 0x9fe0c6 },
  { id: 'mri', name: '진단실', keeper: '찰칵 씨', x: 23, z: 20, roof: 0xf7e08a },
];

// Ten parts. Each needs one item from a shop; the keeper asks one thing before handing it over.
// group: suit (worn), ship (on the rocket), cargo (beside the rocket).
const PARTS = [
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
];
const WRONG_LINES = ['땡! 교과서를 슬쩍 보고 와도 돼.', '아쉽다! 조금 있다 다시 물어봐 줄게.', '음… 그건 아니야. 다시 생각해 봐!'];

const BOT_NAMES = ['콩이봇', '별이봇', '두부봇', '망고봇', '솜이봇', '토리봇', '모카봇', '라온봇', '새벽봇', '하늘봇', '보리봇', '감자봇', '우주봇', '달님봇'];
const SHIRTS = [0xff8fa3, 0x7cc6fe, 0xffd166, 0x95e1a3, 0xc9a0ff, 0xffa26b, 0x6ee7d8, 0xf78fd0, 0xa3b8ff, 0xd4e157, 0xff7b7b, 0x80cbc4, 0xe6b98a, 0xb39ddb, 0x90caf9];
const SHIRT_NAMES = ['분홍', '하늘', '노랑', '연두', '보라', '주황', '민트', '자주', '파랑', '라임', '빨강', '청록', '살구', '연보라', '물빛'];

// Where things stand. x is east, z is south; the camera always looks north.
const PLACES = {
  spawn: { x: 0, z: 5 },
  gacha: { x: -4.5, z: -2 },
  desk: { x: 7, z: -9.5 },
  hq: { x: 7, z: -15 },
  launch: { x: 0, z: -30 },
};
const PAD_SPOTS = []; // 15 workshop pads south of the plaza; the player's is the first
[13, 21, 29].forEach(z => [0, -6.5, 6.5, -13, 13].forEach(x => PAD_SPOTS.push({ x, z })));
const HIDE_SPOTS = [
  { x: -14, z: -20 }, { x: 15, z: -22 }, { x: -31, z: -1 }, { x: 31, z: 13 }, { x: -31, z: 13 },
  { x: 31, z: -1 }, { x: -18, z: 36 }, { x: 18, z: 36 }, { x: 0, z: 37 }, { x: -12, z: -4 }, { x: 13, z: 1 },
];
