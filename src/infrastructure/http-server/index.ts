import express, {
    type NextFunction,
    type Express,
    type Response,
    type Request,
  } from 'express';
  import cors from 'cors';
  import jwt from 'jsonwebtoken';
  
  export type Methods = 'get' | 'post' | 'put' | 'delete' | 'patch';
  export type AddRouterInput = {
    url: string;
    method: Methods;
    handler: (req: Request, res: Response) => Promise<any>;
    auth?: boolean;
  };
  
  class HttpSever {
    public app: Express;
  
    constructor() {
      this.app = express();
      this.app.use(express.json());
      this.app.use(cors());
    }
  
    private addRoute = (route: AddRouterInput) => {
      if (route.auth) {
        this.app[route.method](
          route.url,
          this.authenticateMiddleware,
          route.handler
        );
      } else {
        this.app[route.method](route.url, route.handler);
      }
    };
  
    private authenticateMiddleware(
      req: Request,
      res: Response,
      next: NextFunction
    ) {
  
      const token = req.headers.authorization;
      if (!token) {
         res.status(401).json({ message: 'Unauthorized' })
         return;
      }
      try {
        jwt.verify(token.replace('Bearer ', ''), process.env.JWT!);
        next();
      } catch (error) {
         res.status(401).json({ message: 'Unauthorized' })
         return;
      }
    }
  
    public addRoutes = (routes: AddRouterInput[]) => {
      console.log('================= ROUTES =================');
      console.table(routes, ['url', 'method', 'auth']);
      for (const route of routes) {
        this.addRoute(route);
      }
      console.log('=========================================');
  
      this.app.use((error: any, req: Request, res: Response, _: NextFunction) => {
        console.error(error);
         res.status(500).json({ message: 'Internal Server Error' })
         return;
      });
    };
  
    public start = async () => {
      this.app.listen(Number(process.env.PORT), '0.0.0.0', () => {
        console.debug(`Server running: ${process.env.PORT}`);
      });
    };
  }
  
  export const makeHttpServer = {
    prd: new HttpSever(),
  };
  