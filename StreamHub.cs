using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace wsstream
{
    public class StreamHub : Hub
    {
        static byte[] _init;

        public Task Stream(int clusterId, int segmentId, byte[] data)
        {
            Console.WriteLine($"{clusterId} {segmentId} {data.Length}");
            return Clients.Others.SendAsync("stream", clusterId, segmentId, data);
        }

        public byte[] GetInit()
        {
            return _init;
        }

        public Task Init(byte[] data)
        {
            _init = data;
            return Clients.Others.SendAsync("init", data);
        }
    }
}
