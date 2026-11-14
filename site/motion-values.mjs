export const MOTION_LOOP_SECONDS=8;
export function headSway(seconds){const phase=seconds*Math.PI*2/MOTION_LOOP_SECONDS;return Math.sin(phase)*.054+Math.sin(phase*2)*.008;}
