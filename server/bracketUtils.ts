// Funções auxiliares para geração de chaveamento por formato

export async function generateGroupStageMatches(tournamentId: string, categoryId: string, participants: any[], numGroups: number, advancesPerGroup: number, bestOfSets: number = 3) {
  const matches = [];
  
  // Embaralhar participantes e distribuir nos grupos
  const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);
  const groups: { [key: string]: any[] } = {};
  const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  
  // Distribuir participantes nos grupos
  for (let i = 0; i < numGroups; i++) {
    groups[groupNames[i]] = [];
  }
  
  shuffledParticipants.forEach((participant, index) => {
    const groupIndex = index % numGroups;
    groups[groupNames[groupIndex]].push(participant);
  });
  
  let matchNumber = 1;
  
  // Gerar partidas da fase de grupos (todos contra todos por grupo)
  for (const [groupName, groupParticipants] of Object.entries(groups)) {
    for (let i = 0; i < groupParticipants.length; i++) {
      for (let j = i + 1; j < groupParticipants.length; j++) {
        matches.push({
          tournamentId,
          categoryId,
          player1Id: groupParticipants[i].athleteId,
          player2Id: groupParticipants[j].athleteId,
          round: 1,
          matchNumber: matchNumber++,
          status: 'pending',
          phase: 'group',
          groupName: groupName,
          bestOfSets: bestOfSets
        });
      }
    }
  }
  
  console.log(`Generated ${matches.length} group stage matches across ${numGroups} groups`);
  return matches;
}

export async function generateRoundRobinMatches(tournamentId: string, categoryId: string, participants: any[], isDouble: boolean = false) {
  const matches = [];
  let matchNumber = 1;
  const numParticipants = participants.length;
  
  console.log(`Generating ${isDouble ? 'double ' : ''}round-robin for ${numParticipants} participants`);
  
  if (numParticipants < 2) {
    console.log("Not enough participants for round-robin");
    return matches;
  }
  
  // Algoritmo de round-robin usando o método circular
  const rounds = numParticipants % 2 === 0 ? numParticipants - 1 : numParticipants;
  const participantsForRounds = [...participants];
  
  // Se número ímpar, adicionar um "bye" virtual (que não gera jogos)
  if (numParticipants % 2 === 1) {
    participantsForRounds.push({ athleteId: 'BYE', isVirtualBye: true });
  }
  
  const totalParticipants = participantsForRounds.length;
  
  // Gerar todas as rodadas
  for (let round = 1; round <= rounds; round++) {
    const roundMatches = [];
    
    // Gerar confrontos da rodada
    for (let i = 0; i < totalParticipants / 2; i++) {
      const player1 = participantsForRounds[i];
      const player2 = participantsForRounds[totalParticipants - 1 - i];
      
      // Não criar jogo se um dos participantes é BYE virtual
      if (!player1.isVirtualBye && !player2.isVirtualBye) {
        roundMatches.push({
          tournamentId,
          categoryId,
          player1Id: player1.athleteId,
          player2Id: player2.athleteId,
          round: round,
          matchNumber: matchNumber++,
          status: 'pending',
          phase: 'league',
          bestOfSets: 3
        });
      }
    }
    
    matches.push(...roundMatches);
    
    // Rotacionar participantes (método circular) - fixo primeiro, roda os outros
    if (totalParticipants > 2) {
      const fixed = participantsForRounds[0];
      const rotating = participantsForRounds.slice(1);
      
      // Mover último para o segundo lugar, outros descem uma posição
      const rotated = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
      participantsForRounds.splice(0, participantsForRounds.length, fixed, ...rotated);
    }
  }
  
  // Se é ida e volta, duplicar todos os jogos invertendo as posições
  if (isDouble) {
    const totalRounds = rounds;
    const returnMatches = [];
    
    for (let round = 1; round <= rounds; round++) {
      const roundMatches = matches.filter(m => m.round === round);
      
      for (const match of roundMatches) {
        returnMatches.push({
          ...match,
          player1Id: match.player2Id, // Inverter posições
          player2Id: match.player1Id,
          round: totalRounds + round, // Segunda metade das rodadas
          matchNumber: matchNumber++
        });
      }
    }
    
    matches.push(...returnMatches);
  }
  
  console.log(`Generated ${matches.length} ${isDouble ? 'double ' : ''}round-robin matches in ${isDouble ? rounds * 2 : rounds} rounds`);
  return matches;
}

export async function generateKnockoutMatches(tournamentId: string, categoryId: string, participants: any[], format: string) {
  const matches = [];
  
  // Embaralhar participantes para sortear confrontos
  const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);
  
  // Criar confrontos da primeira fase
  for (let i = 0; i < shuffledParticipants.length; i += 2) {
    const player1 = shuffledParticipants[i];
    const player2 = shuffledParticipants[i + 1] || null; // Pode ser null se número ímpar

    matches.push({
      tournamentId,
      categoryId,
      player1Id: player1.athleteId,
      player2Id: player2?.athleteId || null,
      round: 1,
      matchNumber: Math.floor(i / 2) + 1,
      status: 'pending',
      phase: 'knockout',
      bestOfSets: 3
    });
  }
  
  console.log(`Generated ${matches.length} knockout matches for format: ${format}`);
  return matches;
}

// Calcular standings dos grupos e avançar para mata-mata
export async function advanceToKnockout(tournamentId: string, categoryId: string, groupMatches: any[], advancesPerGroup: number = 2) {
  console.log("=== CALCULATING GROUP STANDINGS ===");
  
  // Organizar partidas por grupo
  const matchesByGroup: { [key: string]: any[] } = {};
  groupMatches.forEach(match => {
    if (!matchesByGroup[match.groupName]) {
      matchesByGroup[match.groupName] = [];
    }
    matchesByGroup[match.groupName].push(match);
  });
  
  console.log("Groups found:", Object.keys(matchesByGroup));
  
  // Calcular classificação de cada grupo
  const qualifiedParticipants = [];
  
  for (const [groupName, matches] of Object.entries(matchesByGroup)) {
    console.log(`\n=== GRUPO ${groupName} ===`);
    
    // Coletar todos os participantes do grupo
    const participantsInGroup = new Set();
    matches.forEach(match => {
      participantsInGroup.add(match.player1Id);
      if (match.player2Id) participantsInGroup.add(match.player2Id);
    });
    
    // Calcular estatísticas por participante
    const standings: { [key: string]: any } = {};
    
    participantsInGroup.forEach(participantId => {
      standings[participantId] = {
        athleteId: participantId,
        matches: 0,
        wins: 0,
        losses: 0,
        setsWon: 0,
        setsLost: 0,
        points: 0 // 3 pontos por vitória, 1 por empate, 0 por derrota
      };
    });
    
    // Processar resultados das partidas
    matches.forEach(match => {
      if (match.status === 'completed' && match.winnerId) {
        const player1Id = match.player1Id;
        const player2Id = match.player2Id;
        const winnerId = match.winnerId;
        const loserId = winnerId === player1Id ? player2Id : player1Id;
        
        standings[player1Id].matches++;
        if (player2Id) standings[player2Id].matches++;
        
        standings[winnerId].wins++;
        standings[winnerId].points += 3;
        
        if (loserId) {
          standings[loserId].losses++;
        }
        
        // Contar sets se disponível no score
        if (match.score) {
          const scoreParts = match.score.split('-');
          if (scoreParts.length === 2) {
            const sets1 = parseInt(scoreParts[0]) || 0;
            const sets2 = parseInt(scoreParts[1]) || 0;
            
            standings[player1Id].setsWon += sets1;
            standings[player1Id].setsLost += sets2;
            
            if (player2Id) {
              standings[player2Id].setsWon += sets2;
              standings[player2Id].setsLost += sets1;
            }
          }
        }
      }
    });
    
    // Ordenar por: pontos (desc), diferença de sets (desc), sets ganhos (desc)
    const groupStandings = Object.values(standings).sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      
      const diffA = a.setsWon - a.setsLost;
      const diffB = b.setsWon - b.setsLost;
      if (diffA !== diffB) return diffB - diffA;
      
      return b.setsWon - a.setsWon;
    });
    
    console.log(`Classificação do Grupo ${groupName}:`);
    groupStandings.forEach((participant, index) => {
      console.log(`${index + 1}º: Atleta ${participant.athleteId} - ${participant.points} pts, ${participant.wins}-${participant.losses}, sets: ${participant.setsWon}-${participant.setsLost}`);
    });
    
    // Pegar os top N do grupo (configurável)
    const qualified = groupStandings.slice(0, advancesPerGroup);
    qualified.forEach(participant => {
      qualifiedParticipants.push({
        athleteId: participant.athleteId,
        groupName: groupName,
        groupPosition: qualified.indexOf(participant) + 1,
        points: participant.points,
        wins: participant.wins,
        losses: participant.losses
      });
    });
  }
  
  console.log(`\n=== CLASSIFICADOS PARA MATA-MATA ===`);
  console.log(`Total de classificados: ${qualifiedParticipants.length}`);
  qualifiedParticipants.forEach(p => {
    console.log(`Atleta ${p.athleteId} - Grupo ${p.groupName} (${p.groupPosition}º lugar) - ${p.points} pts`);
  });
  
  return qualifiedParticipants;
}