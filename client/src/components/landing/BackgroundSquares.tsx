import Squares from "./Squares";

export default function BackgroundSquares() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
      <Squares
        speed={0.5}
        squareSize={40}
        direction="diagonal" // up, down, left, right, diagonal
        borderColor="#fff"
        hoverFillColor="#222"
      />
    </div>
  );
}
