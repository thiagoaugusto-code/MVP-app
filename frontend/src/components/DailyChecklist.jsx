import { useState } from 'react';

const DailyChecklist = ({ items }) => {
  const [checked, setChecked] = useState(new Set());

  const toggleCheck = (id) => {
    const newChecked = new Set(checked);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setChecked(newChecked);
  };

  return (
    <div className="bg-white p-4 rounded shadow-md">
      <h3 className="text-lg font-semibold">Checklist Diário</h3>
      <ul>
        {items.map((item) => (
          <li key={item.id} className="flex items-center">
            <input
              type="checkbox"
              checked={checked.has(item.id)}
              onChange={() => toggleCheck(item.id)}
              className="mr-2"
            />
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DailyChecklist;