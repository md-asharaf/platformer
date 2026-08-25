import React, { useEffect, useRef } from 'react';
import type { QuizQuestion } from '../types/api';

interface GameCanvasProps {
  question: QuizQuestion | null;
  onAnswer: (isCorrect: boolean) => void;
  gameState: 'playing' | 'paused' | 'gameover' | 'menu';
  removedOptions: string[];
  playSound: (type: 'jump' | 'correct' | 'wrong') => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ question, onAnswer, gameState, removedOptions, playSound }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    // Physics & Game settings
    const gravity = 0.6;
    const jumpPower = -12;
    const playerSpeed = 5;

    const isMobile = window.innerWidth <= 767;
    const sizeScale = isMobile ? 1.2 : 1;

    let player = {
      x: 50,
      y: 100,
      width: 20 * sizeScale,
      height: 40 * sizeScale,
      vy: 0,
      vx: 0,
      isGrounded: false,
      isEaten: false,
      isWaitingForNext: false,
      fadeAlpha: 1,
      scaleY: 1,
      runCycle: 0,
      isFallingDeath: false,
      rotation: 0
    };

    let cameraX = 0;

    const keys = {
      ArrowLeft: false,
      ArrowRight: false,
      ArrowUp: false,
    };

    const groundLevel = canvas.height - 100;

    let boxes: { x: number, y: number, width: number, height: number, text: string, isCorrect: boolean, isFading: boolean, alpha: number, scale: number, color: string }[] = [];
    let pits: { x: number, width: number }[] = [];
    let floatingTexts: { x: number, y: number, text: string, color: string, alpha: number, vy: number }[] = [];

    const initLevel = () => {
      player.x = 100;
      player.y = groundLevel - player.height - 200; // start a bit higher
      player.vy = 0;
      player.vx = 0;
      player.isEaten = false;
      player.isWaitingForNext = false;
      player.isFallingDeath = false;
      player.rotation = 0;
      player.fadeAlpha = 1;
      player.scaleY = 1;
      player.runCycle = 0;

      boxes = [];
      pits = [];
      floatingTexts = [];

      cameraX = 0;

      if (question) {
        const startX = 400;
        const gap = 150;

        const letters = ['A', 'B', 'C', 'D'];
        const colors = ['#c0392b', '#2980b9', '#27ae60', '#f39c12'];

        // Count valid options
        let validCount = 0;

        question.options.forEach((opt, index) => {
          if (removedOptions.includes(opt)) return;

          const boxX = Math.floor(startX + index * gap);

          boxes.push({
            x: boxX,
            y: Math.floor(groundLevel - 40 * sizeScale),
            width: 30 * sizeScale, // Scaled box width
            height: 40 * sizeScale,
            text: letters[index] || '?',
            isCorrect: opt === question.answer.value,
            isFading: false,
            alpha: 1,
            scale: 1,
            color: colors[index] || '#8b5a2b'
          });

          // Pit starts after box (boxX + 60), is 60 wide
          if (validCount < 3 && Math.random() > 0.4) {
            pits.push({ x: boxX + 60, width: 60 });
          }
          validCount++;
        });

        // Add a pit at the very end to keep them on their toes
        if (Math.random() > 0.3) {
          pits.push({ x: startX + question.options.length * gap, width: 60 });
        }
      }
    };

    initLevel();

    let jumpRequested = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.code === 'Space') {
        if (gameState === 'playing' && player.isGrounded && !player.isEaten && !player.isWaitingForNext) {
          jumpRequested = true;
        }
      }
      if (e.key === 'ArrowLeft') keys.ArrowLeft = true;
      if (e.key === 'ArrowRight') keys.ArrowRight = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') keys.ArrowLeft = false;
      if (e.key === 'ArrowRight') keys.ArrowRight = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);


    const update = () => {
      if (gameState !== 'playing') return;

      if (jumpRequested) {
        player.vy = jumpPower;
        player.isGrounded = false;
        playSound('jump');
        jumpRequested = false;
      }

      // Physics
      if (!player.isEaten && !player.isWaitingForNext) {
        player.vy += gravity;
        player.y += player.vy;

        if (keys.ArrowLeft) {
          player.vx = -playerSpeed;
          player.runCycle += 1;
        } else if (keys.ArrowRight) {
          player.vx = playerSpeed;
          player.runCycle += 1;
        } else {
          player.vx = 0;
          player.runCycle = 0;
        }

        player.x += player.vx;

        // Ground collision & Pits
        let overPit = false;
        pits.forEach(pit => {
          // If the center of the player is inside the pit, they fall
          const playerCenterX = player.x + player.width / 2;
          if (playerCenterX > pit.x && playerCenterX < pit.x + pit.width) {
            overPit = true;
          }
        });

        if (!overPit && player.y + player.height >= groundLevel) {
          player.y = groundLevel - player.height;
          player.vy = 0;
          player.isGrounded = true;
        } else {
          player.isGrounded = false;
        }

        // Screen bounds (no right bound)
        if (player.x < 0) player.x = 0;

        // Falling animation
        if (overPit && player.y + player.height > groundLevel) {
          player.rotation = (player.rotation || 0) + 0.2;
        } else {
          player.rotation = 0;
        }

        // Death condition: fell in a pit
        if (player.y > canvas.height + 50 && !player.isEaten && !player.isWaitingForNext && !player.isFallingDeath) {
          player.isFallingDeath = true;
          floatingTexts.push({ x: player.x, y: player.y - 100, text: '-10', color: '#ff0000', alpha: 1, vy: -2 });
          setTimeout(() => {
            onAnswer(false);
            initLevel();
          }, 400);
        }

        // Death condition: ran past the correct answer
        if (!player.isEaten && !player.isWaitingForNext && !player.isFallingDeath) {
          const correctBox = boxes.find(b => b.isCorrect);
          if (correctBox && player.x > correctBox.x + correctBox.width + 10 && player.isGrounded) {
            player.isFallingDeath = true;
            floatingTexts.push({ x: player.x, y: player.y - 20, text: '-10', color: '#ff0000', alpha: 1, vy: -2 });
            setTimeout(() => {
              onAnswer(false);
              initLevel();
            }, 400);
          }
        }

        // Box collision
        boxes.forEach(box => {
          if (!box.isFading) {
            // Check intersection
            if (player.x < box.x + box.width &&
              player.x + player.width > box.x &&
              player.y + player.height > box.y &&
              player.y < box.y + box.height) {

              // Only trigger answer if landing on top (moving down, and previous bottom was above the box)
              const prevBottom = player.y - player.vy + player.height;

              if (prevBottom <= box.y + 10) { // +10 leniency for spikes
                if (box.isCorrect) {
                  // Landed on right box -> Stand on top safely
                  player.isWaitingForNext = true;
                  floatingTexts.push({ x: player.x, y: player.y - 20, text: '+100', color: '#00ff00', alpha: 1, vy: -2 });

                  // Lock player to stand on top of box center
                  player.x = box.x + box.width / 2 - player.width / 2;
                  player.y = box.y - player.height;
                  player.vy = 0;
                  player.vx = 0;

                  setTimeout(() => {
                    onAnswer(true);
                    initLevel();
                  }, 500);
                } else {
                  // Hit a wrong box! Get eaten!
                  player.isEaten = true;
                  box.isFading = true;
                  floatingTexts.push({ x: player.x, y: player.y - 20, text: '-10', color: '#ff0000', alpha: 1, vy: -2 });

                  // Lock player to stand on top of box center
                  player.x = box.x + box.width / 2 - player.width / 2;
                  player.y = box.y - player.height;
                  player.vy = 0;
                  player.vx = 0;

                  setTimeout(() => {
                    onAnswer(false);
                    initLevel();
                  }, 500);
                }
              } else {
                // Hit the side, block horizontal movement
                if (player.vx > 0 && player.x + player.width - player.vx <= box.x) {
                  player.x = box.x - player.width;
                } else if (player.vx < 0 && player.x - player.vx >= box.x + box.width) {
                  player.x = box.x + box.width;
                }
              }
            }
          }
        });
      } else if (player.isEaten) {
        // Eaten animation for player (sink into the box and compress)
        player.y += 2; // Sink down faster
        player.fadeAlpha = Math.max(0, player.fadeAlpha - 0.04);
        player.scaleY = Math.max(0, player.scaleY - 0.04);
      } else if (player.isWaitingForNext) {
        // Just stand still on top of the correct box
        player.vx = 0;
      }

      // Camera logic: follow player
      cameraX = player.x - canvas.width / 3;
      if (cameraX < 0) cameraX = 0;

      // Box fade animation
      boxes.forEach(box => {
        if (box.isFading) {
          box.alpha = Math.max(0, box.alpha - 0.04);
          // No need to scale box, let the player compression do the work
        }
      });
    };

    const drawPlayer = (ctx: CanvasRenderingContext2D) => {
      ctx.save();

      const cx = player.x + player.width / 2;
      // Anchor scale at the bottom of the player (their feet)
      const cy = player.y + player.height;

      ctx.translate(cx, cy);
      ctx.scale(1, player.scaleY); // Compress vertically
      ctx.translate(-cx, -cy);

      ctx.globalAlpha = player.fadeAlpha;

      // We draw relative to the actual player position now
      ctx.translate(cx, cy - player.height / 2);
      if (player.rotation) {
        ctx.rotate(player.rotation);
      }

      // Calculate stickman proportions based on player height
      const s = player.height / 40;
      const headRadius = 6 * s;
      const bodyLen = 15 * s;
      const armLen = 12 * s;
      const legLen = 15 * s;

      ctx.strokeStyle = '#000000';
      ctx.fillStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';

      // Draw Head
      ctx.beginPath();
      ctx.arc(0, -player.height / 2 + headRadius, headRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw Body
      ctx.beginPath();
      ctx.moveTo(0, -player.height / 2 + headRadius * 2);
      ctx.lineTo(0, -player.height / 2 + headRadius * 2 + bodyLen);
      ctx.stroke();

      const isFrame2 = Math.floor(player.runCycle / 5) % 2 === 0;

      let armAngle1 = 0, armAngle2 = 0, legAngle1 = 0, legAngle2 = 0;

      if (!player.isGrounded) {
        armAngle1 = -Math.PI / 4;
        armAngle2 = Math.PI / 2;
        legAngle1 = -Math.PI / 6;
        legAngle2 = Math.PI / 4;
      } else if (player.vx !== 0 && !player.isEaten) {
        if (isFrame2) {
          armAngle1 = Math.PI / 4;
          armAngle2 = -Math.PI / 4;
          legAngle1 = -Math.PI / 4;
          legAngle2 = Math.PI / 4;
        } else {
          armAngle1 = -Math.PI / 4;
          armAngle2 = Math.PI / 4;
          legAngle1 = Math.PI / 4;
          legAngle2 = -Math.PI / 4;
        }
      } else {
        // Idle pose so arms and legs don't merge into the body line
        armAngle1 = 0.2;
        armAngle2 = -0.2;
        legAngle1 = 0.2;
        legAngle2 = -0.2;
      }

      const bodyBottomY = -player.height / 2 + headRadius * 2 + bodyLen;
      const shoulderY = -player.height / 2 + headRadius * 2 + 3;

      ctx.beginPath(); ctx.moveTo(0, shoulderY); ctx.lineTo(Math.sin(armAngle1) * armLen, shoulderY + Math.cos(armAngle1) * armLen); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, shoulderY); ctx.lineTo(Math.sin(armAngle2) * armLen, shoulderY + Math.cos(armAngle2) * armLen); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, bodyBottomY); ctx.lineTo(Math.sin(legAngle1) * legLen, bodyBottomY + Math.cos(legAngle1) * legLen); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, bodyBottomY); ctx.lineTo(Math.sin(legAngle2) * legLen, bodyBottomY + Math.cos(legAngle2) * legLen); ctx.stroke();

      ctx.restore();
    };

    const draw = () => {
      ctx.save();
      ctx.translate(-cameraX, 0);

      // Clear (fill with background color covering the visible camera area)
      ctx.fillStyle = '#b48a47';
      ctx.fillRect(cameraX, 0, canvas.width, canvas.height);

      // Draw solid ground everywhere first
      ctx.fillStyle = '#f0b86a';
      ctx.fillRect(cameraX, groundLevel, canvas.width, canvas.height - groundLevel);

      // Draw pits as background-colored rectangles over the ground
      ctx.fillStyle = '#b48a47'; // Background color to simulate empty space
      pits.forEach(pit => {
        // Only draw pits that are visible
        if (pit.x + pit.width > cameraX && pit.x < cameraX + canvas.width) {
          ctx.fillRect(pit.x, groundLevel, pit.width, canvas.height - groundLevel);
        }
      });

      // Draw boxes
      boxes.forEach(box => {
        ctx.save();
        ctx.globalAlpha = box.alpha;

        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;

        ctx.translate(cx, cy);

        // Draw normal box base
        ctx.fillStyle = box.color;
        ctx.fillRect(-box.width / 2, -box.height / 2, box.width, box.height);

        // Draw Saw/Spikes on top
        ctx.fillStyle = box.color;
        ctx.beginPath();
        const numSpikes = 5;
        const spikeWidth = box.width / numSpikes;
        const spikeHeight = 10;
        ctx.moveTo(-box.width / 2, -box.height / 2);
        for (let i = 0; i < numSpikes; i++) {
          const sx = -box.width / 2 + i * spikeWidth;
          ctx.lineTo(sx + spikeWidth / 2, -box.height / 2 - spikeHeight);
          ctx.lineTo(sx + spikeWidth, -box.height / 2);
        }
        ctx.closePath();
        ctx.fill();


        ctx.strokeStyle = '#5c3614';
        ctx.lineWidth = 4;
        ctx.strokeRect(-box.width / 2 + 2, -box.height / 2 + 2, box.width - 4, box.height - 4);

        if (box.isFading) {
          // Simulate mouth closing over time as alpha decreases
          const mouthHeight = box.height * (1 - box.alpha);
          ctx.fillStyle = 'black';
          ctx.fillRect(-box.width / 2 + 4, -box.height / 2, box.width - 8, mouthHeight);
        }

        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px "Courier New", Courier, monospace';
        ctx.textAlign = 'center';
        // Adjust text position so it fits on thinner box, maybe under the box or lower down
        ctx.fillText(box.text, 0, box.height / 2 + 15);

        ctx.restore();
      });

      drawPlayer(ctx);

      // Draw floating texts
      floatingTexts.forEach(ft => {
        ft.y += ft.vy;
        ft.alpha -= 0.04;
        if (ft.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = ft.alpha;
          ctx.fillStyle = ft.color;
          ctx.font = 'bold 36px "Courier New"';
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 4;
          // Note: texts are drawn in world coordinates so they follow the camera properly
          ctx.strokeText(ft.text, ft.x, ft.y);
          ctx.fillText(ft.text, ft.x, ft.y);
          ctx.restore();
        }
      });

      ctx.restore(); // Restore camera translation
    };

    const loop = () => {
      update();
      draw();
      animationFrameId = window.requestAnimationFrame(loop);
    };

    loop();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [question, gameState, removedOptions, onAnswer, playSound]);

  return (
    <canvas
      ref={canvasRef}
      width={1024}
      height={576}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        display: 'block'
      }}
    />
  );
};
