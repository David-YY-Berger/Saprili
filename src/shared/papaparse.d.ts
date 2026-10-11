// bisiyata dishmaya, leharbot ahava biyisral
declare module 'papaparse' {
  interface ParseError {
    row: number;
  }

  interface ParseResult<T> {
    data: T[];
    errors: ParseError[];
  }

  interface ParseConfig {
    delimiter?: string;
    dynamicTyping?: boolean;
    skipEmptyLines?: boolean;
  }

  const Papa: {
    parse<T>(input: string, config?: ParseConfig): ParseResult<T>;
  };

  export default Papa;
}
