/** Choisit le noir ou le blanc qui maximise le contraste WCAG sur une couleur opaque. */
export function contrastInk(hex: string): '#000000' | '#ffffff' {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : '6366f1'
  const channels = [0, 2, 4].map((index) => parseInt(normalized.slice(index, index + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? '#000000' : '#ffffff'
}
