import { Agent } from './agent';

declare global {
    namespace Express {
        interface Request {
            agent?: Agent;
        }
    }
}
