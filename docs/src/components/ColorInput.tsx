interface ColorInputProps {
  value: string;
  onChange: (color: string) => void;
  label: string;
}

export function ColorInput({ value, onChange, label }: ColorInputProps) {
  return (
    <div className="color-input">
      <label className="color-input-label">{label}</label>
      <div className="color-input-controls">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="color-input-picker"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            // Accept any text while typing, validate on blur
            onChange(v);
          }}
          className="color-input-text"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

