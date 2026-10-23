interface VM {
  securityManager: {
    getSandboxMode(url: string): string | Promise<string>;
    canLoadExtensionFromProject(
      url: string
    ): boolean | Promise<boolean>;
  };
}

declare namespace VM {
  interface Runtime {
    ext_scratch3_sensing?: {
      _questionList: [string, ...unknown[]][];
    };
    wrapAssetRequest?<T>(request: () => Promise<T>): Promise<T>;
  }

  interface RuntimeAndVirtualMachineEventMap {
    CREATE_UNSANDBOXED_EXTENSION_API: [scratch: object];
    ASSET_PROGRESS: [finished: number, total: number];
  }
}
