const StreakCard = ({ streak }) => {
  return (
    <div className="bg-white p-4 rounded shadow-md">
      <h3 className="text-lg font-semibold">Streak Atual</h3>
      <p className="text-2xl font-bold text-green-600">{streak} dias</p>
    </div>
  );
};

export default StreakCard;