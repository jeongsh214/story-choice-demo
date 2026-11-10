// 임시 이야기는 이 파일에서 교체합니다. 각 사건의 선택·결과·효과를 함께 정의합니다.
const baseChoices = [
  {
    id: 'one', label: '선택지 1', description: '신중하게 진행합니다. 작은 보상을 기대할 수 있습니다.', chance: 80, tone: 'balanced',
    success: { text: '차근차근 살핀 덕분에 무사히 일을 마쳤습니다. 작은 성과가 기록에 남았습니다.', effects: { wealth: 6, reputation: 3, mental: 2 } },
    failure: { text: '예상하지 못한 변수가 생겼습니다. 조금 지쳤지만, 다음 선택을 이어갈 수 있습니다.', effects: { health: -5, mental: -3 } }
  },
  {
    id: 'two', label: '선택지 2', description: '과감하게 도전합니다. 더 큰 보상과 위험이 따릅니다.', chance: 50, tone: 'risky',
    success: { text: '과감한 선택이 좋은 결과로 돌아왔습니다. 사람들은 당신의 이름을 조금씩 기억합니다.', effects: { wealth: 14, connections: 6, reputation: 7 } },
    failure: { text: '이번 도전은 뜻대로 풀리지 않았습니다. 손실을 정리하고 다시 발걸음을 옮깁니다.', effects: { health: -12, mental: -8, wealth: -5 } }
  },
  {
    id: 'three', label: '선택지 3', description: '잠시 쉬어 갑니다. 자원을 조금 쓰고 몸과 마음을 회복합니다.', chance: 100, tone: 'safe',
    success: { text: '한숨 돌리니 주변이 조금 다르게 보입니다. 몸과 마음을 추스르고 다음 순간을 기다립니다.', effects: { health: 8, mental: 7, wealth: -2 } },
    failure: { text: '잠시 쉬어 갑니다.', effects: {} }
  }
];

export const statDefinitions = [
  { key: 'health', label: '건강', color: '#91b7a1' },
  { key: 'mental', label: '정신력', color: '#a4a9cd' },
  { key: 'wealth', label: '재산', color: '#d5b77a' },
  { key: 'connections', label: '인맥', color: '#82b1b5' },
  { key: 'reputation', label: '평판', color: '#bd96ad' }
];

export const scenes = [
  { id: 'arrival', day: 1, time: '오전 8:00', label: '첫 번째 기록', kicker: '새로운 하루가 시작됩니다', title: '이야기의 첫 페이지', paragraphs: ['익숙하지 않은 거리 위로 아침빛이 내려앉습니다. 어디로 향할지, 무엇을 남길지 아직 정해진 것은 없습니다.', '이곳의 이야기는 당신의 선택에서 시작됩니다. 아래 세 가지 선택지를 눌러, 서로 다른 확률과 결과를 경험해 보세요.'], choices: baseChoices },
  { id: 'crossroads', day: 1, time: '오후 1:00', label: '두 번째 기록', kicker: '작은 갈림길 앞에서', title: '또 하나의 가능성', paragraphs: ['거리를 걷던 당신 앞에 작은 기회가 찾아왔습니다. 조심스럽게 살펴볼 수도, 망설임 없이 다가갈 수도 있습니다.', '이전 선택의 결과는 상태창에 남아 있습니다. 이번에는 어떤 선택을 하시겠습니까?'], choices: baseChoices },
  { id: 'afternoon', day: 1, time: '오후 6:00', label: '세 번째 기록', kicker: '오후의 빛이 기울고', title: '걸어온 길의 무게', paragraphs: ['거리의 그림자가 길어집니다. 오늘 마주친 일들이 하나둘 당신의 기록에 쌓입니다.', '작은 성과를 이어갈지, 더 큰 기회를 노릴지, 아니면 쉬어 갈지. 잠시 생각한 뒤 선택해 보세요.'], choices: baseChoices },
  { id: 'new-morning', day: 2, time: '오전 9:00', label: '네 번째 기록', kicker: '다음 날, 같은 거리에서', title: '어제와 다른 당신', paragraphs: ['새로운 아침입니다. 거리는 어제와 비슷하지만, 당신에게는 지나온 선택들이 남아 있습니다.', '이 장면도 체험을 위한 임시 사건입니다. 실제 이야기에서는 앞선 선택에 따라 다른 인물과 사건을 만나게 됩니다.'], choices: baseChoices },
  { id: 'last-page', day: 2, time: '오후 5:00', label: '다섯 번째 기록', kicker: '이번 기록의 마지막 순간', title: '마지막으로 남길 선택', paragraphs: ['노을이 창가에 오래 머뭅니다. 짧은 여정의 마지막 선택을 앞두고 당신은 잠시 걸음을 멈춥니다.', '어떤 결과든 당신의 기록으로 남습니다. 마지막 선택을 마치면 이번 이야기의 결과를 확인할 수 있습니다.'], choices: baseChoices }
];
