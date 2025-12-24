'use client';

import { Configuration, FrontendApi } from '@ory/client';

const kratos = new FrontendApi(
    new Configuration({
        basePath: "http://0.0.0.0:4433",
        baseOptions: {
            withCredentials: true,
        },
    }),
);

export { kratos };
