const InsightCard = ({ insight }) => {
  return (
    <div className="bg-white p-4 rounded shadow-md">
      <h3 className="text-lg font-semibold">Insight do Dia</h3>
      <p>{insight}</p>
    </div>
  );
};

export default InsightCard;