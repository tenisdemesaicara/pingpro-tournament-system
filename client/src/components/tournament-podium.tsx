import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Award } from "lucide-react";
import { motion } from "framer-motion";

interface PodiumPosition {
  playerId: string;
  playerName: string;
  photoUrl?: string;
  position: number; // 1, 2, 3, 3 (dois terceiros)
}

interface TournamentPodiumProps {
  winners: PodiumPosition[];
  onClose?: () => void;
}

export function TournamentPodium({ winners, onClose }: TournamentPodiumProps) {
  // Organizar posições no pódium
  const first = winners.find(w => w.position === 1);
  const second = winners.find(w => w.position === 2);
  const thirds = winners.filter(w => w.position === 3);

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1: return <Trophy className="w-8 h-8 text-yellow-500" />;
      case 2: return <Medal className="w-7 h-7 text-gray-400" />;
      case 3: return <Award className="w-6 h-6 text-amber-600" />;
      default: return null;
    }
  };

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1: return "from-yellow-400 to-yellow-600";
      case 2: return "from-gray-300 to-gray-500"; 
      case 3: return "from-amber-400 to-amber-600";
      default: return "from-blue-400 to-blue-600";
    }
  };

  const getPositionHeight = (position: number) => {
    switch (position) {
      case 1: return "h-32"; // Mais alto
      case 2: return "h-24"; // Médio
      case 3: return "h-16"; // Mais baixo
      default: return "h-12";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-8 max-w-4xl w-full mx-2 sm:mx-4 max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-500 to-yellow-700 bg-clip-text text-transparent">
            🏆 Pódium da Categoria
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Parabéns aos vencedores!
          </p>
        </motion.div>

        {/* Pódium Principal */}
        <div className="flex items-end justify-center gap-2 sm:gap-6 md:gap-8 mb-6 sm:mb-8">
          {/* 2º Lugar */}
          {second && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 100 }}
              className="flex flex-col items-center"
            >
              <div className="relative mb-2 sm:mb-4">
                <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border-2 sm:border-4 border-gray-300">
                  {second.photoUrl ? (
                    <AvatarImage src={second.photoUrl} alt={second.playerName} />
                  ) : null}
                  <AvatarFallback className="text-lg sm:text-xl font-bold bg-gradient-to-br from-gray-400 to-gray-600 text-white">
                    {second.playerName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -top-1 sm:-top-2 -right-1 sm:-right-2 bg-gray-300 text-gray-700 rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center font-bold text-xs sm:text-sm">
                  2º
                </div>
              </div>
              <h3 className="font-bold text-sm sm:text-lg text-center px-1">{second.playerName}</h3>
              <div className={`bg-gradient-to-t ${getPositionColor(2)} ${getPositionHeight(2)} w-16 sm:w-24 rounded-t-lg flex items-center justify-center mt-1 sm:mt-2`}>
                {getPositionIcon(2)}
              </div>
            </motion.div>
          )}

          {/* 1º Lugar */}
          {first && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8, type: "spring", stiffness: 100 }}
              className="flex flex-col items-center"
            >
              <div className="relative mb-2 sm:mb-4">
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-3 sm:border-4 border-yellow-400">
                  {first.photoUrl ? (
                    <AvatarImage src={first.photoUrl} alt={first.playerName} />
                  ) : null}
                  <AvatarFallback className="text-xl sm:text-2xl font-bold bg-gradient-to-br from-yellow-400 to-yellow-600 text-white">
                    {first.playerName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -top-2 sm:-top-3 -right-2 sm:-right-3 bg-yellow-400 text-yellow-900 rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center font-bold text-sm sm:text-base">
                  1º
                </div>
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                  className="absolute -top-4 sm:-top-6 -left-1 sm:-left-2 text-lg sm:text-2xl"
                >
                  👑
                </motion.div>
              </div>
              <h3 className="font-bold text-base sm:text-xl text-center px-1">{first.playerName}</h3>
              <div className={`bg-gradient-to-t ${getPositionColor(1)} ${getPositionHeight(1)} w-20 sm:w-28 rounded-t-lg flex items-center justify-center mt-1 sm:mt-2`}>
                {getPositionIcon(1)}
              </div>
            </motion.div>
          )}

          {/* Terceiros Lugares */}
          <div className="flex flex-col gap-2 sm:gap-4">
            {thirds.map((third, index) => (
              <motion.div
                key={third.playerId}
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1 + (index * 0.2), type: "spring", stiffness: 100 }}
                className="flex items-center gap-2 sm:gap-3 bg-amber-50 dark:bg-amber-950 p-2 sm:p-3 rounded-lg border border-amber-200 dark:border-amber-800"
              >
                <div className="relative">
                  <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-amber-400">
                    {third.photoUrl ? (
                      <AvatarImage src={third.photoUrl} alt={third.playerName} />
                    ) : null}
                    <AvatarFallback className="text-xs sm:text-sm font-bold bg-gradient-to-br from-amber-400 to-amber-600 text-white">
                      {third.playerName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center font-bold text-xs">
                    3º
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm sm:text-base text-amber-800 dark:text-amber-200">{third.playerName}</h4>
                  <p className="text-xs text-amber-600 dark:text-amber-400">3º Lugar</p>
                </div>
                <div className="flex-shrink-0">
                  {getPositionIcon(3)}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Botão para fechar */}
        {onClose && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="text-center mt-4 sm:mt-6"
          >
            <button
              onClick={onClose}
              className="px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm sm:text-base font-medium"
              data-testid="button-close-podium"
            >
              Fechar Pódium
            </button>
          </motion.div>
        )}

        {/* Efeitos de confetes */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl"
        >
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-2xl"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -20, 0],
                rotate: [0, 360, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "easeInOut",
              }}
            >
              🎉
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}