import { Redirect } from "wouter";

/** Legacy calculator links now lead to a conversation with Eric. */
export default function Estimator() {
  return <Redirect to="/contact" replace />;
}
