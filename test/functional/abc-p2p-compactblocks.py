#!/usr/bin/env python3
# Copyright (c) 2015-2016 The Bitcoin Core developers
# Copyright (c) 2017 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
This test checks simple acceptance of bigger blocks via p2p.
It is derived from the much more complex p2p-fullblocktest.
The intention is that small tests can be derived from this one, or
this one can be extended, to cover the checks done for bigger blocks
(e.g. sigops limits).
"""

from test_framework.test_framework import ComparisonTestFramework
from test_framework.util import *
from test_framework.comptool import TestManager, TestInstance, RejectResult
from test_framework.blocktools import *
import time
from test_framework.script import *
from test_framework.cdefs import (ONE_MEGABYTE, LEGACY_MAX_BLOCK_SIZE,
                                  MAX_BLOCK_SIGOPS_PER_MB, MAX_TX_SIGOPS_COUNT)
from collections import deque


class PreviousSpendableOutput():

    def __init__(self, tx=CTransaction(), n=-1):
        self.tx = tx
        self.n = n  # the output we're spending


# TestNode: A peer we use to send messages to bitcoind, and store responses.
class TestNode(NodeConnCB):

    def __init__(self):
        self.last_sendcmpct = None
        self.last_cmpctblock = None
        self.last_getheaders = None
        self.last_headers = None
        super().__init__()

    def on_sendcmpct(self, conn, message):
        self.last_sendcmpct = message

    def on_cmpctblock(self, conn, message):
        self.last_cmpctblock = message
        self.last_cmpctblock.header_and_shortids.header.calc_sha256()

    def on_getheaders(self, conn, message):
        self.last_getheaders = message

    def on_headers(self, conn, message):
        self.last_headers = message
        for x in self.last_headers.headers:
            x.calc_sha256()

    def clear_block_data(self):
        with mininode_lock:
            self.last_sendcmpct = None
            self.last_cmpctblock = None


class FullBlockTest(ComparisonTestFramework):

    # Can either run this test as 1 node with expected answers, or two and compare them.
    # Change the "outcome" variable from each TestInstance object to only do
    # the comparison.

    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = True
        self.block_heights = {}
        self.tip = None
        self.blocks = {}
        self.excessive_block_size = 100 * ONE_MEGABYTE
        self.extra_args = [['-norelaypriority',
                            '-whitelist=127.0.0.1',
                            '-limitancestorcount=9999',
                            '-limitancestorsize=9999',
                            '-limitdescendantcount=9999',
                            '-limitdescendantsize=9999',
                            '-maxmempool=999',
                            "-excessiveblocksize=%d"
                            % self.excessive_block_size]]

    def add_options(self, parser):
        super().add_options(parser)
        parser.add_option(
            "--runbarelyexpensive", dest="runbarelyexpensive", default=True)

    def run_test(self):
        self.test = TestManager(self, self.options.tmpdir)
        self.test.add_all_connections(self.nodes)
        # Start up network handling in another thread
        NetworkThread().start()
        # Set the blocksize to 2MB as initial condition
        self.nodes[0].setexcessiveblock(self.excessive_block_size)
        self.test.run()

    def add_transactions_to_block(self, block, tx_list):
        [tx.rehash() for tx in tx_list]
        block.vtx.extend(tx_list)

    # this is a little handier to use than the version in blocktools.py
    def create_tx(self, spend_tx, n, value, script=CScript([OP_TRUE])):
        tx = create_transaction(spend_tx, n, b"", value, script)
        return tx

    def next_block(self, number, spend=None, script=CScript([OP_TRUE]), block_size=0, extra_sigops=0):
        if self.tip == None:
            base_block_hash = self.genesis_hash
            block_time = int(time.time()) + 1
        else:
            base_block_hash = self.tip.sha256
            block_time = self.tip.nTime + 1
        # First create the coinbase
        height = self.block_heights[base_block_hash] + 1
        coinbase = create_coinbase(height)
        coinbase.rehash()
        if spend == None:
            # We need to have something to spend to fill the block.
            assert_equal(block_size, 0)
            block = create_block(base_block_hash, coinbase, block_time)
        else:
            # all but one satoshi to fees
            coinbase.vout[0].nValue += spend.tx.vout[spend.n].nValue - 1
            coinbase.rehash()
            block = create_block(base_block_hash, coinbase, block_time)
            # spend 1 satoshi
            tx = CTransaction()
            tx.vin.append(CTxIn(COutPoint(spend.tx.sha256, spend.n)))
            # Make sure we have plenty engough to spend going forward.
            spendable_outputs = deque([])

            def add_spendable_outputs(tx):
                for i in range(8):
                    tx.vout.append(CTxOut(0, CScript([OP_TRUE])))
                    spendable_outputs.append(PreviousSpendableOutput(tx, i))
            add_spendable_outputs(tx)

            # Make it the same format as transaction added for padding and save the size.
            # It's missing the padding output, so we add a constant to account for it.
            tx.rehash()
            base_tx_size = len(tx.serialize()) + 18

            # If a specific script is required, add it.
            if script != None:
                tx.vout.append(CTxOut(1, script))

            # Put some random data into the first transaction of the chain to randomize ids.
            tx.vout.append(
                CTxOut(0, CScript([random.randint(0, 256), OP_RETURN])))

            # Add the transaction to the block
            self.add_transactions_to_block(block, [tx])

            # If we have a block size requirement, just fill
            # the block until we get there
            current_block_size = len(block.serialize())
            while current_block_size < block_size:
                # We will add a new transaction. That means the size of
                # the field enumerating how many transaction go in the block
                # may change.
                current_block_size -= len(ser_compact_size(len(block.vtx)))
                current_block_size += len(ser_compact_size(len(block.vtx) + 1))

                # Create the new transaction
                tx = CTransaction()
                # Spend from one of the spendable outputs
                spend = spendable_outputs.popleft()
                tx.vin.append(CTxIn(COutPoint(spend.tx.sha256, spend.n)))
                # Add spendable outputs
                add_spendable_outputs(tx)

                # Add padding to fill the block.
                script_length = block_size - current_block_size - base_tx_size
                if script_length > 510000:
                    script_length = 500000
                tx_sigops = min(extra_sigops, script_length,
                                MAX_TX_SIGOPS_COUNT)
                extra_sigops -= tx_sigops
                script_pad_len = script_length - tx_sigops
                script_output = CScript(
                    [b'\x00' * script_pad_len] + [OP_CHECKSIG] * tx_sigops)
                tx.vout.append(CTxOut(0, script_output))

                # Add the tx to the list of transactions to be included
                # in the block.
                self.add_transactions_to_block(block, [tx])
                current_block_size += len(tx.serialize())

            # Now that we added a bunch of transaction, we need to recompute
            # the merkle root.
            block.hashMerkleRoot = block.calc_merkle_root()

        # Check that the block size is what's expected
        if block_size > 0:
            assert_equal(len(block.serialize()), block_size)

        # Do PoW, which is cheap on regnet
        block.solve()
        self.tip = block
        self.block_heights[block.sha256] = height
        assert number not in self.blocks
        self.blocks[number] = block
        return block

    def get_tests(self):
        self.genesis_hash = int(self.nodes[0].getbestblockhash(), 16)
        self.block_heights[self.genesis_hash] = 0
        spendable_outputs = []

        # save the current tip so it can be spent by a later block
        def save_spendable_output():
            spendable_outputs.append(self.tip)

        # get an output that we previously marked as spendable
        def get_spendable_output():
            return PreviousSpendableOutput(spendable_outputs.pop(0).vtx[0], 0)

        # returns a test case that asserts that the current tip was accepted
        def accepted():
            return TestInstance([[self.tip, True]])

        # returns a test case that asserts that the current tip was rejected
        def rejected(reject=None):
            if reject is None:
                return TestInstance([[self.tip, False]])
            else:
                return TestInstance([[self.tip, reject]])

        # move the tip back to a previous block
        def tip(number):
            self.tip = self.blocks[number]

        # adds transactions to the block and updates state
        def update_block(block_number, new_transactions):
            block = self.blocks[block_number]
            self.add_transactions_to_block(block, new_transactions)
            old_sha256 = block.sha256
            block.hashMerkleRoot = block.calc_merkle_root()
            block.solve()
            # Update the internal state just like in next_block
            self.tip = block
            if block.sha256 != old_sha256:
                self.block_heights[
                    block.sha256] = self.block_heights[old_sha256]
                del self.block_heights[old_sha256]
            self.blocks[block_number] = block
            return block

        # shorthand for functions
        block = self.next_block

        # Create a new block
        block(0)
        save_spendable_output()
        yield accepted()

        # Now we need that block to mature so we can spend the coinbase.
        test = TestInstance(sync_every_block=False)
        for i in range(99):
            block(5000 + i)
            test.blocks_and_transactions.append([self.tip, True])
            save_spendable_output()
        yield test

        # collect spendable outputs now to avoid cluttering the code later on
        out = []
        for i in range(100):
            out.append(get_spendable_output())

        # Check that compact block also work for big blocks
        node = self.nodes[0]
        peer = TestNode()
        peer.add_connection(NodeConn('127.0.0.1', p2p_port(0), node, peer))

        # Start up network handling in another thread and wait for connection
        # to be etablished
        NetworkThread().start()
        peer.wait_for_verack()

        # Wait for SENDCMPCT
        def received_sendcmpct():
            return (peer.last_sendcmpct != None)
        wait_until(received_sendcmpct, timeout=30)

        sendcmpct = msg_sendcmpct()
        sendcmpct.version = 1
        sendcmpct.announce = True
        peer.send_and_ping(sendcmpct)

        # Exchange headers
        def received_getheaders():
            return (peer.last_getheaders != None)
        wait_until(received_getheaders, timeout=30)

        # Return the favor
        peer.send_message(peer.last_getheaders)

        # Wait for the header list
        def received_headers():
            return (peer.last_headers != None)
        wait_until(received_headers, timeout=30)

        # It's like we know about the same headers !
        peer.send_message(peer.last_headers)

        # Send a block
        b1 = block(1, spend=out[0], block_size=ONE_MEGABYTE + 1)
        yield accepted()

        # Checks the node to forward it via compact block
        def received_block():
            return (peer.last_cmpctblock != None)
        wait_until(received_block, timeout=30)

        # Was it our block ?
        cmpctblk_header = peer.last_cmpctblock.header_and_shortids.header
        cmpctblk_header.calc_sha256()
        assert(cmpctblk_header.sha256 == b1.sha256)

        # Send a bigger block
        peer.clear_block_data()
        b2 = block(2, spend=out[1], block_size=self.excessive_block_size)
        yield accepted()

        # Checks the node forwards it via compact block
        wait_until(received_block, timeout=30)

        # Was it our block ?
        cmpctblk_header = peer.last_cmpctblock.header_and_shortids.header
        cmpctblk_header.calc_sha256()
        assert(cmpctblk_header.sha256 == b2.sha256)

        # Let's send a compact block and see if the node accepts it.
        # First, we generate the block and send all transaction to the mempool
        b3 = block(3, spend=out[2], block_size=8 * ONE_MEGABYTE)
        for i in range(1, len(b3.vtx)):
            node.sendrawtransaction(ToHex(b3.vtx[i]), True)

        # Now we create the compact block and send it
        comp_block = HeaderAndShortIDs()
        comp_block.initialize_from_block(b3)
        peer.send_and_ping(msg_cmpctblock(comp_block.to_p2p()))

        # Check that compact block is received properly
        assert(int(node.getbestblockhash(), 16) == b3.sha256)


if __name__ == '__main__':
    FullBlockTest().main()
