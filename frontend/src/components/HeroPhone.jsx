import Icon from '../icons.jsx'

/** Điện thoại 3D mô phỏng thao tác chấm công bằng khuôn mặt (hình minh hoạ, thuần CSS/SVG). */
export default function HeroPhone() {
  return (
    <div className="hp" aria-hidden="true">
      <div className="hp-glow" />
      <div className="hp-phone">
        <span className="hp-notch" />
        <div className="hp-sc scan">
          <small>Chấm công</small>
          <div className="hp-face">
            <svg viewBox="0 0 200 240" fill="none">
              <path className="outline" d="M100 18C150 18 173 60 170 112C167 162 140 216 100 224C60 216 33 162 30 112C27 60 50 18 100 18Z" />
              <g className="mesh">
                <path d="M60 90L90 84L100 100L110 84L140 90M75 105L100 100L125 105M100 100L90 140L110 140L100 100M90 140L78 168L100 178L122 168L110 140M78 168L52 150L60 90L38 96M122 168L148 150L140 90L162 96M52 150L44 128M148 150L156 128M100 178L100 222M78 168L68 200M122 168L132 200M60 90L72 52L100 44L128 52L140 90M100 44L100 84" />
              </g>
              <g className="pts">
                {[[60, 90], [90, 84], [110, 84], [140, 90], [75, 105], [125, 105], [100, 100], [90, 140], [110, 140], [78, 168], [122, 168], [100, 178], [52, 150], [148, 150], [72, 52], [128, 52], [100, 44]].map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r="3" style={{ animationDelay: `${(i * 137) % 900}ms` }} />
                ))}
              </g>
            </svg>
            <i className="hp-line" /><b className="c1" /><b className="c2" /><b className="c3" /><b className="c4" />
          </div>
          <p>Đang nhận diện khuôn mặt<span className="dots" /></p>
        </div>
        <div className="hp-sc okay">
          <span className="hp-ring"><svg viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="34" /><path d="M25 41l10 10 20-22" /></svg></span>
          <strong>Chấm công thành công</strong>
          <em>07:58</em>
          <span className="hp-pill">Trong phạm vi cơ quan</span>
        </div>
      </div>
      <div className="hp-chip a"><Icon name="sparkle" size={15} /> AI tách bước tự động</div>
      <div className="hp-chip b"><Icon name="target" size={15} /> Mở đúng <b>Bước 03</b></div>
      <div className="hp-chip c"><Icon name="search" size={15} /> gõ không dấu vẫn tìm ra</div>
    </div>
  )
}
