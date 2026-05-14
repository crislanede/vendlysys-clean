type Props = {
  selectedDate: string;
  onSelect: (date: string) => void;
};

export default function MiniCalendar({
  selectedDate,
  onSelect,
}: Props) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full rounded-xl border p-2"
      />
    </div>
  );
}