import { useEffect, useState } from 'react';
import { useSuiClient } from '@mysten/dapp-kit';

interface GameData {
  gameId: string;
  tier: number;
  status: number;
  currentRound: number;
  playerCount: number;
  eliminatedCount: number;
  prizePool: string;
  currentQuestioner: string;
  questionAsked: boolean;
}

export function useGameData(gameId: string | null) {
  const suiClient = useSuiClient();
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) {
      setGameData(null);
      return;
    }

    const fetchGameData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const object = await suiClient.getObject({
          id: gameId,
          options: {
            showContent: true,
            showType: true,
          },
        });

        if (!object.data) {
          throw new Error('Game not found');
        }

        // Parse the game data from the object content
        const content = object.data.content as any;
        
        if (content?.dataType === 'moveObject') {
          const fields = content.fields;
          
          setGameData({
            gameId,
            tier: fields.tier || 0,
            status: fields.status || 0,
            currentRound: fields.current_round || 0,
            playerCount: fields.players?.length || 0,
            eliminatedCount: fields.eliminated?.length || 0,
            prizePool: fields.prize_pool || '0',
            currentQuestioner: fields.current_questioner || '',
            questionAsked: fields.question_asked || false,
          });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to fetch game data';
        setError(errorMsg);
        console.error('Error fetching game data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGameData();

    // Optional: Poll for updates every 5 seconds
    const interval = setInterval(fetchGameData, 5000);
    return () => clearInterval(interval);
  }, [gameId, suiClient]);

  return { gameData, isLoading, error };
}
